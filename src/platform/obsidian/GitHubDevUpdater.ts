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
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${revision}/${file}?t=${Date.now()}`;
}

/** Fail closed if the SHA cannot be resolved. Falling back to moving main
 * would make the displayed revision different from the installed files. */
async function readGitHubHead(): Promise<GitHubHead> {
  let payload: any;
  try {
    const response = await requestUrl({
      url: `${GITHUB_API}/commits/${GITHUB_BRANCH}?t=${Date.now()}`,
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
    payload = response.json;
  } catch (error) {
    throw new Error(`获取 GitHub ${GITHUB_BRANCH} 最新提交失败：${errorText(error)}；尚未覆盖本地文件`);
  }
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
    // GitHub retains at most 300 recent events, 100 per page. An exact match
    // may be on page 2/3, especially when a repository is active.
    for (let page = 1; page <= 3; page++) {
      const response = await requestUrl({
        url: `${GITHUB_API}/events?per_page=100&page=${page}`,
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (response.status !== 200 || !Array.isArray(response.json)) return null;
      const matched = findGitHubRevisionPushTime(response.json, sha);
      if (matched) return matched;
      if (response.json.length < 100) break;
    }
    return null;
  } catch {
    return null; // Push-event metadata must never block a valid pinned update.
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
  let response: Awaited<ReturnType<typeof requestUrl>>;
  try {
    response = await requestUrl({ url: rawFileUrl(file, sha) });
  } catch (error) {
    throw new Error(`下载 ${file}（${sha.slice(0, 7)}）失败：${errorText(error)}；尚未覆盖本地文件`);
  }
  if (response.status !== 200) {
    throw new Error(`下载 ${file}（${sha.slice(0, 7)}）失败：HTTP ${response.status}；尚未覆盖本地文件`);
  }
  assertDownloadedFile(file, response.text);
  return response.text;
}

async function downloadPinnedBuild(sha: string): Promise<Record<DevBuildFile, string>> {
  const entries = await Promise.all(DEV_BUILD_FILES.map(async (file) =>
    [file, await readFileAtRevision(file, sha)] as const));
  return Object.fromEntries(entries) as Record<DevBuildFile, string>;
}

async function infoAtHead(head: GitHubHead, expectedPluginId: string): Promise<GitHubDevBuildInfo> {
  const [manifestText, githubPushedAt] = await Promise.all([
    readFileAtRevision('manifest.json', head.sha),
    waitForPushTime(readGitHubPushTime(head.sha)),
  ]);
  return {
    remoteVersion: parseAndValidateManifest(manifestText, expectedPluginId).version,
    branch: GITHUB_BRANCH,
    githubPushedAt,
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

/** Always resolve main again on click: the settings preview may be stale.
 * Download all three files at that freshly resolved, immutable SHA. */
export async function pullGitHubDevBuild(
  host: GitHubDevUpdaterHost,
  _preview?: GitHubDevBuildInfo | null,
): Promise<GitHubDevUpdateResult> {
  const head = await readGitHubHead();
  // Start the optional push-time lookup in parallel, not after writing files.
  const pushTimePromise = readGitHubPushTime(head.sha);
  const downloaded = await downloadPinnedBuild(head.sha);
  const manifest = parseAndValidateManifest(downloaded['manifest.json'], host.manifest.id);
  const pluginDir = normalizePath(`${host.app.vault.configDir}/plugins/${host.manifest.id}`);
  await installPinnedFiles(host.app.vault.adapter, pluginDir, downloaded);

  // A missing/slow PushEvent is metadata only: the successful update must
  // still return and show the restart reminder promptly.
  const githubPushedAt = await waitForPushTime(pushTimePromise);
  const installed: GitHubDevUpdateResult = {
    remoteVersion: manifest.version,
    branch: GITHUB_BRANCH,
    githubCommitAt: head.committedAt,
    githubPushedAt,
    commitSha: head.sha,
  };
  let notice: Notice | null = null;
  try { notice = new Notice(formatGitHubDevRestartNotice(installed), 0); }
  catch { /* A notification failure cannot turn a completed install into an error. */ }

  // The events API may deliver the exact PushEvent late. Update the same
  // persistent notice when it arrives, without ever delaying download success.
  if (!githubPushedAt && notice) {
    const successNotice = notice;
    void pushTimePromise.then((latePushedAt) => {
      if (!latePushedAt) return;
      try {
        successNotice.setMessage(formatGitHubDevRestartNotice({
          ...installed, githubPushedAt: latePushedAt,
        }));
      } catch { /* A dismissed notice must not affect the installation. */ }
    });
  }
  return installed;
}
