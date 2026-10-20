import { Notice, normalizePath, requestUrl } from 'obsidian';

const GITHUB_OWNER = 'jiangjiang3788';
const GITHUB_REPO = 'obsidian-sample-plugin-master';
const GITHUB_BRANCH = 'main';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
const DEV_BUILD_FILES = ['main.js', 'styles.css', 'manifest.json'] as const;
type DevBuildFile = (typeof DEV_BUILD_FILES)[number];

interface VaultAdapterLike {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<string>;
  write(path: string, data: string): Promise<void>;
  remove?(path: string): Promise<void>;
}

/** A pinned GitHub revision, with push time only when verifiable. */
export interface GitHubDevBuildInfo {
  remoteVersion: string;
  branch: string;
  /** GitHub push event timestamp for this exact SHA; null if the event expired. */
  githubPushedAt: string | null;
  /** Timestamp stored in the Git commit; not GitHub upload time. */
  githubCommitAt: string | null;
  commitSha: string;
}

export interface GitHubDevUpdateResult extends GitHubDevBuildInfo {}

function formatLocalGitHubTime(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return '暂不可用';
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

/** Always include the push-time field in the restart reminder. A Git commit's
 * timestamp must never be represented as its GitHub push/upload timestamp. */
export function formatGitHubDevRestartNotice(info: GitHubDevUpdateResult): string {
  const pushed = info.githubPushedAt
    ? `GitHub 推送时间（本地）：${formatLocalGitHubTime(info.githubPushedAt)}`
    : 'GitHub 推送时间：暂未查到该版本对应的推送记录';
  const committed = !info.githubPushedAt && info.githubCommitAt
    ? `\nGit 提交时间（非推送时间）：${formatLocalGitHubTime(info.githubCommitAt)}`
    : '';
  return `Think OS 开发版下载完成\n版本：${info.remoteVersion}（${info.branch} · ${info.commitSha.slice(0, 7)}）\n${pushed}${committed}\n请完全退出并重新打开 Obsidian。`;
}

export interface GitHubDevUpdaterHost {
  app: { vault: { configDir: string; adapter: VaultAdapterLike } };
  manifest: { id: string };
}

type GitHubHead = { sha: string; committedAt: string | null };

const OPTIONAL_PUSH_TIME_WAIT_MS = 1200;

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** A best-effort timestamp lookup must never indefinitely hold up an update. */
function waitForPushTime(promise: Promise<string | null>): Promise<string | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), OPTIONAL_PUSH_TIME_WAIT_MS);
    void promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      () => { clearTimeout(timer); resolve(null); },
    );
  });
}

function isCommitSha(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value);
}

function validIsoTime(value: unknown): string | null {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString() : null;
}

function rawFileUrl(file: DevBuildFile, revision: string): string {
  // The SHA is immutable; a timestamp query is unnecessary and can upset CDNs.
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${revision}/${file}`;
}

type RequestStage = 'head' | 'file';

/** Keep the failing phase available to the settings UI without parsing text. */
class GitHubRequestError extends Error {
  constructor(
    readonly requestStage: RequestStage,
    readonly httpStatus: number | null,
    message: string,
  ) {
    super(message);
    this.name = 'GitHubRequestError';
  }
}

type GitHubResponse = Awaited<ReturnType<typeof requestUrl>>;

function responseHeader(response: GitHubResponse, name: string): string | undefined {
  return Object.entries(response.headers || {}).find(([key]) => key.toLowerCase() === name)?.[1];
}

function responseJson(response: GitHubResponse): any {
  // requestUrl.json may be a getter that throws when a server sends HTML.
  if (typeof response.text === 'string') return JSON.parse(response.text);
  return response.json; // Test transports which expose a decoded object only.
}

function describeHttpFailure(stage: RequestStage, operation: string, response: GitHubResponse): GitHubRequestError {
  const status = response.status;
  const remaining = responseHeader(response, 'x-ratelimit-remaining');
  const retryAfter = responseHeader(response, 'retry-after');
  const reset = Number(responseHeader(response, 'x-ratelimit-reset'));
  const resetTime = Number.isFinite(reset) && reset > 0
    ? new Date(reset * 1000).toLocaleString('zh-CN', { hour12: false }) : null;
  let reason = '';
  if (status === 403 || status === 429) {
    if (remaining === '0') reason = resetTime
      ? `GitHub API 配额已用完，请在 ${resetTime} 后再试` : 'GitHub API 配额已用完，请稍后重试';
    else if (retryAfter) reason = `GitHub 要求等待 ${retryAfter} 秒后重试`;
    else reason = '请求被拒绝，可能是访问限制、限流或网络代理问题';
  } else if (status === 404) reason = '目标文件不存在或仓库未推送该构建产物';
  let serverMessage = '';
  try {
    const message = responseJson(response)?.message;
    if (typeof message === 'string') serverMessage = message.replace(/\s+/g, ' ').slice(0, 160);
  } catch { /* A text/html error body should not override HTTP status. */ }
  const extra = [reason, serverMessage].filter(Boolean).join('；');
  return new GitHubRequestError(stage, status,
    `${operation} 失败：HTTP ${status}${extra ? `（${extra}）` : ''}；尚未覆盖本地文件`);
}

/** Only the latest main SHA is used for the ordinary update button.
 * Do not silently install an older preview when this request fails. */
async function readGitHubHead(): Promise<GitHubHead> {
  let response: GitHubResponse;
  try {
    response = await requestUrl({
      url: `${GITHUB_API}/commits/${GITHUB_BRANCH}`,
      headers: { Accept: 'application/vnd.github+json', 'Cache-Control': 'no-cache' },
      throw: false,
    });
  } catch (error) {
    throw new GitHubRequestError('head', null,
      `获取 GitHub ${GITHUB_BRANCH} 最新提交失败（api.github.com）：${errorText(error)}；尚未覆盖本地文件`);
  }
  if (response.status !== 200) {
    throw describeHttpFailure('head', `获取 GitHub ${GITHUB_BRANCH} 最新提交（api.github.com）`, response);
  }
  let payload: any;
  try { payload = responseJson(response); }
  catch { throw new Error('GitHub 最新提交响应不是有效 JSON，已停止下载'); }
  if (!isCommitSha(payload?.sha)) throw new Error('GitHub 未返回有效提交 SHA，已停止下载');
  return { sha: payload.sha, committedAt: validIsoTime(payload?.commit?.committer?.date) };
}

/** GitHub's repository events are short-lived. Only an exact SHA+branch match
 * can be truthfully shown as this build's upload/push timestamp. */
export function findGitHubRevisionPushTime(events: unknown, sha: string): string | null {
  if (!Array.isArray(events) || !isCommitSha(sha)) return null;
  for (const event of events) {
    if (event?.type === 'PushEvent'
      && event?.payload?.ref === `refs/heads/${GITHUB_BRANCH}`
      && event?.payload?.head === sha) {
      return validIsoTime(event.created_at);
    }
  }
  return null;
}

async function readGitHubPushTime(sha: string): Promise<string | null> {
  try {
    // Optional metadata, at most ONE events request per successful install.
    // Missing/expired events must not prevent a download or cause API retries.
    const response = await requestUrl({
      url: `${GITHUB_API}/events?per_page=100`,
      headers: { Accept: 'application/vnd.github+json' },
      throw: false,
    });
    if (response.status !== 200) return null;
    return findGitHubRevisionPushTime(responseJson(response), sha);
  } catch {
    return null;
  }
}

function assertDownloadedFile(file: DevBuildFile, text: string): void {
  if (!text.trim()) throw new Error(`${file} 内容为空`);
  if (/^\s*<(?:!doctype|html)/i.test(text)) throw new Error(`${file} 返回了网页内容，而不是插件文件`);
  if (file === 'main.js' && text.length < 1000) throw new Error('main.js 内容异常，已停止覆盖');
  if (file === 'styles.css' && text.length < 100) throw new Error('styles.css 内容异常，已停止覆盖');
}

function parseAndValidateManifest(text: string, expectedPluginId: string): { version: string } {
  let manifest: any;
  try { manifest = JSON.parse(text); }
  catch { throw new Error('远端 manifest.json 不是有效 JSON'); }
  if (manifest?.id !== expectedPluginId) {
    throw new Error(`远端插件 ID 不匹配：${String(manifest?.id || 'unknown')}`);
  }
  if (manifest?.main && manifest.main !== 'main.js') {
    throw new Error(`远端 manifest main 字段异常：${String(manifest.main)}`);
  }
  if (manifest?.styles && manifest.styles !== 'styles.css') {
    throw new Error(`远端 manifest styles 字段异常：${String(manifest.styles)}`);
  }
  if (typeof manifest.version !== 'string' || !manifest.version.trim()) {
    throw new Error('远端版本号缺失，已停止覆盖');
  }
  return { version: manifest.version.trim() };
}

async function readFileAtRevision(file: DevBuildFile, sha: string): Promise<string> {
  let response: GitHubResponse;
  try {
    response = await requestUrl({ url: rawFileUrl(file, sha), throw: false });
  } catch (error) {
    throw new GitHubRequestError('file', null,
      `下载 ${file}（${sha.slice(0, 7)}，raw.githubusercontent.com）失败：${errorText(error)}；尚未覆盖本地文件`);
  }
  if (response.status !== 200) {
    throw describeHttpFailure('file',
      `下载 ${file}（${sha.slice(0, 7)}，raw.githubusercontent.com）`, response);
  }
  assertDownloadedFile(file, response.text);
  return response.text;
}

async function downloadPinnedBuild(sha: string): Promise<Record<DevBuildFile, string>> {
  // Avoid three simultaneous raw-CDN requests on constrained mobile networks.
  // No local file is touched until all responses are validated.
  const downloaded = {} as Record<DevBuildFile, string>;
  for (const file of DEV_BUILD_FILES) downloaded[file] = await readFileAtRevision(file, sha);
  return downloaded;
}

async function infoAtHead(head: GitHubHead, expectedPluginId: string): Promise<GitHubDevBuildInfo> {
  // Settings preview needs only the head + manifest. PushEvent is best effort
  // and queried AFTER an install, not every time settings are opened.
  const manifestText = await readFileAtRevision('manifest.json', head.sha);
  return {
    remoteVersion: parseAndValidateManifest(manifestText, expectedPluginId).version,
    branch: GITHUB_BRANCH,
    githubPushedAt: null,
    githubCommitAt: head.committedAt,
    commitSha: head.sha,
  };
}

export async function getGitHubDevBuildInfo(expectedPluginId: string): Promise<GitHubDevBuildInfo> {
  return infoAtHead(await readGitHubHead(), expectedPluginId);
}

type Backups = Record<DevBuildFile, string | null>;

async function readBackups(adapter: VaultAdapterLike, pluginDir: string): Promise<Backups> {
  const entries = await Promise.all(DEV_BUILD_FILES.map(async (file) => {
    const path = `${pluginDir}/${file}`;
    return [file, await adapter.exists(path) ? await adapter.read(path) : null] as const;
  }));
  const backups = Object.fromEntries(entries) as Backups;
  if (DEV_BUILD_FILES.some((file) => backups[file] === null) && !adapter.remove) {
    throw new Error('本地插件文件缺失且存储不支持回滚删除，已停止覆盖');
  }
  return backups;
}

async function restoreBackups(
  adapter: VaultAdapterLike, dir: string, backups: Backups, touched: DevBuildFile[],
): Promise<string[]> {
  const errors: string[] = [];
  for (const file of [...touched].reverse()) {
    try {
      const path = `${dir}/${file}`;
      if (backups[file] === null) await adapter.remove!(path);
      else await adapter.write(path, backups[file]!);
    } catch { errors.push(file); }
  }
  return errors;
}

/** Download+validate -> backup -> write+readback -> manifest LAST.
 * A failing write is included in the rollback list because adapters can leave
 * a partially written file before rejecting their Promise. */
async function installPinnedFiles(
  adapter: VaultAdapterLike, dir: string, downloaded: Record<DevBuildFile, string>,
): Promise<void> {
  const backups = await readBackups(adapter, dir);
  const touched: DevBuildFile[] = [];
  try {
    for (const file of DEV_BUILD_FILES) {
      touched.push(file);
      const path = `${dir}/${file}`;
      await adapter.write(path, downloaded[file]);
      if (await adapter.read(path) !== downloaded[file]) {
        throw new Error(`${file} 写入校验失败`);
      }
    }
  } catch (error) {
    const failed = await restoreBackups(adapter, dir, backups, touched);
    const message = error instanceof Error ? error.message : String(error);
    if (failed.length) throw new Error(`${message}；回滚 ${failed.join('、')} 失败，请从备份恢复`);
    throw new Error(`${message}；已回滚到原版本`);
  }
}

/** Normal update always rechecks main. Supplying a pinned preview explicitly
 * means "install this inspected SHA" (only from the separately labelled UI
 * fallback), never "this is the latest main". */
export async function pullGitHubDevBuild(
  host: GitHubDevUpdaterHost,
  pinnedPreview?: GitHubDevBuildInfo | null,
): Promise<GitHubDevUpdateResult> {
  const pinned = pinnedPreview != null;
  if (pinned && !isCommitSha(pinnedPreview.commitSha)) {
    throw new Error('已检查版本 SHA 无效，已停止下载');
  }
  const head = pinned
    ? { sha: pinnedPreview.commitSha, committedAt: pinnedPreview.githubCommitAt }
    : await readGitHubHead();
  const downloaded = await downloadPinnedBuild(head.sha);
  const manifest = parseAndValidateManifest(downloaded['manifest.json'], host.manifest.id);
  if (pinned && manifest.version !== pinnedPreview.remoteVersion) {
    throw new Error('已检查版本与下载的 manifest.json 不一致，未覆盖本地文件');
  }
  const pluginDir = normalizePath(`${host.app.vault.configDir}/plugins/${host.manifest.id}`);
  await installPinnedFiles(host.app.vault.adapter, pluginDir, downloaded);

  // Delay the optional API call until all files have been committed successfully.
  // It may fail or be rate limited; neither case invalidates the update.
  const pushTimePromise = pinnedPreview?.githubPushedAt
    ? Promise.resolve(pinnedPreview.githubPushedAt)
    : readGitHubPushTime(head.sha);
  const githubPushedAt = await waitForPushTime(pushTimePromise);
  const installed: GitHubDevUpdateResult = {
    remoteVersion: manifest.version,
    branch: GITHUB_BRANCH,
    githubCommitAt: head.committedAt,
    githubPushedAt,
    commitSha: head.sha,
  };
  const warning = pinned ? '\n本次安装先前检查的 SHA，未验证它仍是 main 最新提交。' : '';
  let notice: Notice | null = null;
  try { notice = new Notice(formatGitHubDevRestartNotice(installed) + warning, 0); }
  catch { /* Notice failure cannot turn a completed install into an error. */ }

  if (!githubPushedAt && notice) {
    const successNotice = notice;
    void pushTimePromise.then((latePushedAt) => {
      if (!latePushedAt) return;
      try {
        successNotice.setMessage(formatGitHubDevRestartNotice({
          ...installed, githubPushedAt: latePushedAt,
        }) + warning);
      } catch { /* A dismissed notice must not affect the installation. */ }
    });
  }
  return installed;
}
