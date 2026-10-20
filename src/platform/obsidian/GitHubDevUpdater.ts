import { normalizePath, requestUrl } from 'obsidian';

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

export interface GitHubDevUpdaterHost {
  app: { vault: { configDir: string; adapter: VaultAdapterLike } };
  manifest: { id: string };
}

type GitHubHead = { sha: string; committedAt: string | null };

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
      url: `${GITHUB_API}/commits/${GITHUB_BRANCH}`,
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
    payload = response.json;
  } catch {
    throw new Error('GitHub 提交信息不可用，无法确保同一版本，已停止下载；请稍后重试');
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
    const response = await requestUrl({
      url: `${GITHUB_API}/events?per_page=100`,
      headers: { Accept: 'application/vnd.github+json' },
    });
    return response.status === 200 ? findGitHubRevisionPushTime(response.json, sha) : null;
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
  const response = await requestUrl({ url: rawFileUrl(file, sha) });
  if (response.status !== 200) throw new Error(`下载 ${file} 失败（HTTP ${response.status}）`);
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
    readGitHubPushTime(head.sha),
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

/** Install a coherent, immutable revision or make no changes. */
export async function pullGitHubDevBuild(
  host: GitHubDevUpdaterHost,
  preview?: GitHubDevBuildInfo | null,
): Promise<GitHubDevUpdateResult> {
  const selected = preview && isCommitSha(preview.commitSha)
    ? preview : await getGitHubDevBuildInfo(host.manifest.id);
  if (!isCommitSha(selected.commitSha)) throw new Error('预览 SHA 无效，已停止下载');
  const downloaded = await downloadPinnedBuild(selected.commitSha);
  const manifest = parseAndValidateManifest(downloaded['manifest.json'], host.manifest.id);
  if (manifest.version !== selected.remoteVersion) {
    throw new Error('GitHub 预览版本与下载版本不匹配，未覆盖本地文件');
  }
  const pluginDir = normalizePath(`${host.app.vault.configDir}/plugins/${host.manifest.id}`);
  await installPinnedFiles(host.app.vault.adapter, pluginDir, downloaded);
  return selected;
}
