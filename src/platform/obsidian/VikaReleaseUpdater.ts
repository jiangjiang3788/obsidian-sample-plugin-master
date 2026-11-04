/** Vika: three plain plugin files, one dated record. No ZIP and no GitHub Release. */
import { Notice, normalizePath, requestUrl } from 'obsidian';
import { container } from 'tsyringe';
import { SettingsRepository } from '@core/services/public';
import { DEV_BUILD_FILES, installDevBuild, validateDevBuild, withDevBuildInstallLock, type DevBuildFile, type DevBuildContents, type DevBuildHost } from './DevBuildInstaller';
import { contentBuildId } from './DevBuildFingerprint';
import { traceThinkOperation } from './ThinkDiagnostics';

const API = 'https://vika.cn/fusion/v1';
const DATASHEET = 'dstoKKbqk6Rv7E3vhy';
const F = { version: '版本号', build: '构建ID', uploaded: '上传时间' } as const;
const MAX_FILE_BYTES = 40 * 1024 * 1024;

let lastRequest = 0;
let queue: Promise<void> = Promise.resolve();
function apiRequest<T>(action: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = Math.max(0, lastRequest + 650 - Date.now());
    if (wait) await new Promise<void>(resolve => setTimeout(resolve, wait));
    lastRequest = Date.now();
    return action();
  });
  queue = run.then(() => undefined, () => undefined);
  return run;
}

export interface VikaUpdateHost extends DevBuildHost {}
export interface VikaBuildInfo {
  remoteVersion: string;
  buildId: string;
  localBuildId: string | null;
  uploadedAt: number;
  recordId: string;
  isNewBuild: boolean;
}
type Attachment = { url?: string; name?: string; token?: string; size?: number };
type RecordRow = { recordId?: string; fields?: Record<string, unknown> };
type CloudBuild = Omit<VikaBuildInfo, 'localBuildId' | 'isNewBuild'> & { attachments: Record<DevBuildFile, Attachment> };
const validHash = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);

function repo(): SettingsRepository { return container.resolve(SettingsRepository); }
/** Credentials are part of the existing Think/data.json settings, never .env.local or Plugin.saveData(). */
export function hasVikaCredential(): boolean { return !!repo().getSettings().vikaApiToken?.trim(); }
export async function saveVikaCredential(token: string): Promise<void> {
  const value = token.trim();
  if (!value || /\s/.test(value)) throw new Error('维格表 API 令牌不能为空或包含空白字符');
  await repo().update(draft => { draft.vikaApiToken = value; });
}
function tokenOf(): string {
  const token = repo().getSettings().vikaApiToken?.trim();
  if (!token) throw new Error('请先在 Think OS 设置中保存维格表 API 令牌（Think/data.json）');
  return token;
}

async function getJson(path: string, token: string): Promise<any> {
  return apiRequest(async () => {
    let response: Awaited<ReturnType<typeof requestUrl>>;
    try {
      response = await requestUrl({
        url: `${API}${path}`, method: 'GET', throw: false,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Cache-Control': 'no-cache' },
      });
    } catch { throw new Error('无法访问维格表 API，请检查网络'); }
    if (response.status !== 200) throw new Error(`维格表 API HTTP ${response.status}，请检查令牌和数据表权限`);
    let body: any;
    try { body = JSON.parse(response.text); }
    catch { throw new Error('维格表 API 返回非 JSON 内容'); }
    if (!body || body.success !== true || body.code !== 200) {
      throw new Error(`维格表 API 错误 ${String(body?.code ?? 'unknown')}：${String(body?.message ?? '未知错误').slice(0, 100)}`);
    }
    return body.data;
  });
}

function parseRow(row: RecordRow): CloudBuild | null {
  const fields = row.fields ?? {};
  const attachments = {} as CloudBuild['attachments'];
  for (const file of DEV_BUILD_FILES) {
    const list = fields[file];
    if (!Array.isArray(list) || list.length !== 1) return null;
    const attachment = list[0] as Attachment;
    if (!attachment || !attachment.url || !attachment.token
      || !Number.isSafeInteger(attachment.size) || attachment.size! <= 0 || attachment.size! > MAX_FILE_BYTES) return null;
    attachments[file] = attachment;
  }
  const version = fields[F.version];
  const buildId = fields[F.build];
  const uploadedAt = fields[F.uploaded];
  if (!row.recordId || !/^rec\w+$/.test(row.recordId)
    || typeof version !== 'string' || !version.trim()
    || !validHash(buildId)
    || typeof uploadedAt !== 'number' || !Number.isFinite(uploadedAt) || uploadedAt <= 0) return null;
  return {
    recordId: row.recordId,
    remoteVersion: version.trim(),
    buildId: buildId.toLowerCase(),
    uploadedAt,
    attachments,
  };
}

async function latest(token: string): Promise<CloudBuild> {
  const params = new URLSearchParams();
  params.set('pageSize', '100'); params.set('pageNum', '1');
  params.append('sort[][field]', F.uploaded); params.append('sort[][order]', 'desc');
  const data = await getJson(`/datasheets/${DATASHEET}/records?${params}`, token);
  if (!Array.isArray(data?.records)) throw new Error('维格表记录格式异常');
  const rows = (data.records as RecordRow[]).map(parseRow).filter((r): r is CloudBuild => r !== null);
  rows.sort((a, b) => b.uploadedAt - a.uploadedAt);
  if (!rows.length) throw new Error('维格表还没有包含三个原始文件的完整上传记录');
  return rows[0];
}

async function pinned(token: string, recordId: string): Promise<CloudBuild> {
  const data = await getJson(`/datasheets/${DATASHEET}/records?recordIds=${encodeURIComponent(recordId)}`, token);
  const row = ((data?.records ?? []) as RecordRow[]).find(item => item.recordId === recordId);
  const result = row && parseRow(row);
  if (!result) throw new Error('选中的维格表构建记录已失效或缺少附件');
  return result;
}

async function localBuildId(host: VikaUpdateHost): Promise<string | null> {
  const dir = normalizePath(`${host.app.vault.configDir}/plugins/${host.manifest.id}`);
  const files = {} as DevBuildContents;
  for (const file of DEV_BUILD_FILES) {
    const path = `${dir}/${file}`;
    if (!(await host.app.vault.adapter.exists(path))) return null;
    files[file] = await host.app.vault.adapter.read(path);
  }
  try { validateDevBuild(files, host.manifest.id); }
  catch { return null; }
  return contentBuildId(files);
}

function safeAttachmentUrl(link: string): string {
  let url: URL;
  try { url = new URL(link); }
  catch { throw new Error('附件下载链接无效'); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password
    || !/(^|\.)(vika\.cn|vika\.com|aitable\.ai|apitable\.com|apitable\.cn)$/.test(host)) {
    throw new Error('附件地址不是允许的维格表域名，拒绝下载');
  }
  return url.href;
}
async function downloadFile(attachment: Attachment, name: DevBuildFile): Promise<string> {
  let response: Awaited<ReturnType<typeof requestUrl>>;
  try { response = await requestUrl({ url: safeAttachmentUrl(attachment.url!), throw: false, method: 'GET' }); }
  catch { throw new Error(`下载 ${name} 失败，请检查网络`); }
  if (response.status !== 200) throw new Error(`${name} 下载 HTTP ${response.status}（附件链接可能已过期）`);
  const buffer = response.arrayBuffer;
  if (!buffer || buffer.byteLength !== attachment.size || buffer.byteLength > MAX_FILE_BYTES) {
    throw new Error(`${name} 附件大小异常，拒绝安装`);
  }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
  catch { throw new Error(`${name} 不是有效 UTF-8 文件`); }
}

export async function inspectVikaBuild(host: VikaUpdateHost): Promise<VikaBuildInfo> {
  return traceThinkOperation('vika.check', async () => {
    const cloud = await latest(tokenOf());
    const local = await localBuildId(host);
    return { remoteVersion: cloud.remoteVersion, buildId: cloud.buildId, uploadedAt: cloud.uploadedAt,
      recordId: cloud.recordId, localBuildId: local, isNewBuild: local !== cloud.buildId };
  }, 'updates');
}

export async function pullVikaBuild(host: VikaUpdateHost): Promise<VikaBuildInfo> {
  return withDevBuildInstallLock(() => traceThinkOperation('vika.install', async () => {
    const token = tokenOf();
    const cloud = await latest(token);
    const local = await localBuildId(host);
    const info: VikaBuildInfo = {
      remoteVersion: cloud.remoteVersion, buildId: cloud.buildId, uploadedAt: cloud.uploadedAt,
      recordId: cloud.recordId, localBuildId: local, isNewBuild: local !== cloud.buildId,
    };
    if (!info.isNewBuild) return info;
    // Pin the record and re-fetch links: API attachment URLs expire after two hours.
    let chosen = await pinned(token, cloud.recordId);
    if (chosen.buildId !== cloud.buildId) throw new Error('下载期间云端构建发生变化，请重新检查更新');
    const files = {} as DevBuildContents;
    for (const name of DEV_BUILD_FILES) {
      try { files[name] = await downloadFile(chosen.attachments[name], name); }
      catch (firstError) {
        chosen = await pinned(token, cloud.recordId);
        if (chosen.buildId !== cloud.buildId) throw new Error('云端构建发生变化，拒绝安装');
        try { files[name] = await downloadFile(chosen.attachments[name], name); }
        catch { throw firstError; }
      }
    }
    const version = validateDevBuild(files, host.manifest.id);
    if (version !== cloud.remoteVersion) throw new Error('manifest.json 与云端版本号不一致');
    if (await contentBuildId(files) !== cloud.buildId) throw new Error('三个插件文件的内容指纹不一致，已停止覆盖');
    await installDevBuild(host, files);
    try {
      new Notice(`Think OS 维格表更新完成\n版本：${version} · 构建 ${cloud.buildId.slice(0, 12)}\n上传时间：${new Date(cloud.uploadedAt).toLocaleString('zh-CN')}\n请完全退出并重新打开 Obsidian。`, 0);
    } catch { /* Do not invalidate a successful installation if Notice fails. */ }
    return info;
  }, 'updates'));
}

export function vikaSettingsActions(_host: VikaUpdateHost) {
  return {
    supported: true,
    hasToken: () => hasVikaCredential(),
    saveToken: (token: string) => saveVikaCredential(token),
    inspect: () => inspectVikaBuild(_host),
    pull: () => pullVikaBuild(_host),
  };
}
