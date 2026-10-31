/** Vika dev updates: three attachments per row, no ZIP or GitHub Releases. */
import { App, Modal, Notice, Setting, normalizePath, requestUrl } from 'obsidian';
import { container } from 'tsyringe';
import { SettingsRepository } from '@core/services/public';
import { DEV_BUILD_FILES, buildFingerprint, installDevBuild, validateDevBuild, withDevBuildLock,
  type DevBuildContents, type DevBuildFile, type DevBuildHost } from './DevBuildFiles';

const API = 'https://vika.cn/fusion/v1/datasheets/dstoKKbqk6Rv7E3vhy/records';
const F = { version: '版本号', build: '构建ID', time: '上传时间' } as const;
const MAX_BYTES = 40 * 1024 * 1024;
type Attachment = { url: string; size: number; token: string };
type CloudBuild = { id: string; version: string; fingerprint: string; time: number; files: Record<DevBuildFile, Attachment> };

function settings(): SettingsRepository { return container.resolve(SettingsRepository); }
function credential(): string {
  const token = settings().getSettings().vikaApiToken?.trim();
  if (!token) throw new Error('尚未配置维格表 API 令牌，请先运行命令「维格表：设置令牌」');
  return token;
}

/** Password editor is a command, not a second settings framework. */
export function openVikaTokenDialog(app: App): void {
  new (class extends Modal {
    onOpen(): void {
      let input = '';
      this.contentEl.createEl('h3', { text: 'Think OS · 维格表令牌' });
      this.contentEl.createEl('p', { text: '保存到现有 Think/data.json（明文，勿提交到 Git）。' });
      new Setting(this.contentEl).setName('API 令牌').addText(text => {
        text.inputEl.type = 'password';
        text.setPlaceholder('粘贴你的新令牌').onChange((value: string) => { input = value; });
      });
      new Setting(this.contentEl).addButton(button => button.setButtonText('保存').setCta().onClick(async () => {
        const value = input.trim();
        if (!value || /\s/.test(value)) { new Notice('令牌不能为空或含空格'); return; }
        try {
          await settings().update(draft => { draft.vikaApiToken = value; });
          new Notice('维格表令牌已保存到 Think/data.json');
          this.close();
        } catch (error) { new Notice(`保存失败：${error instanceof Error ? error.message : String(error)}`); }
      }));
    }
    onClose(): void { this.contentEl.empty(); }
  })(app).open();
}

async function rows(token: string, params: URLSearchParams): Promise<any[]> {
  let response: Awaited<ReturnType<typeof requestUrl>>;
  try {
    response = await requestUrl({ url: `${API}?${params}`, method: 'GET', throw: false,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Cache-Control': 'no-cache' } });
  } catch { throw new Error('无法连接维格表，请检查网络'); }
  if (response.status !== 200) throw new Error(`维格表 API HTTP ${response.status}，请检查令牌和权限`);
  let body: any;
  try { body = JSON.parse(response.text); } catch { throw new Error('维格表 API 返回无效 JSON'); }
  if (!body?.success || body?.code !== 200 || !Array.isArray(body.data?.records)) {
    throw new Error(`维格表返回错误：${String(body?.message ?? '未知错误').slice(0, 80)}`);
  }
  return body.data.records;
}

function parse(row: any): CloudBuild | null {
  const fields = row?.fields;
  if (!fields || typeof row.recordId !== 'string' || typeof fields[F.version] !== 'string'
    || !/^[a-f0-9]{64}$/i.test(fields[F.build]) || !Number.isFinite(fields[F.time])) return null;
  const files = {} as CloudBuild['files'];
  for (const name of DEV_BUILD_FILES) {
    const attachments = fields[name];
    const item = Array.isArray(attachments) && attachments.length === 1 ? attachments[0] : null;
    if (typeof item?.url !== 'string' || typeof item?.token !== 'string'
      || !Number.isSafeInteger(item?.size) || item.size < 1 || item.size > MAX_BYTES) return null;
    files[name] = item;
  }
  return { id: row.recordId, version: fields[F.version], fingerprint: fields[F.build].toLowerCase(),
    time: fields[F.time], files };
}

async function newest(token: string): Promise<CloudBuild> {
  const params = new URLSearchParams({ pageSize: '100', pageNum: '1' });
  params.append('sort[][field]', F.time); params.append('sort[][order]', 'desc');
  const valid = (await rows(token, params)).map(parse).filter((r): r is CloudBuild => r !== null);
  valid.sort((a, b) => b.time - a.time);
  if (!valid.length) throw new Error('维格表尚无完整的三文件构建记录');
  return valid[0];
}

async function pinned(token: string, id: string): Promise<CloudBuild> {
  // Avoid exceeding the Vika free API's 2 requests/second limit.
  await new Promise(resolve => setTimeout(resolve, 550));
  const found = (await rows(token, new URLSearchParams({ recordIds: id }))).find(row => row.recordId === id);
  const build = parse(found);
  if (!build) throw new Error('维格表构建记录已更改，请重新更新');
  return build;
}

function attachmentUrl(link: string): string {
  let url: URL;
  try { url = new URL(link); } catch { throw new Error('附件下载链接无效'); }
  if (url.protocol !== 'https:' || url.username || url.password
    || !/(^|\.)(vika\.cn|vika\.com|aitable\.ai|apitable\.com|apitable\.cn)$/.test(url.hostname.toLowerCase())) {
    throw new Error('附件链接域名不符合预期，已取消下载');
  }
  return url.href;
}

async function getAttachment(name: DevBuildFile, data: Attachment): Promise<string> {
  let response: Awaited<ReturnType<typeof requestUrl>>;
  try { response = await requestUrl({ url: attachmentUrl(data.url), method: 'GET', throw: false }); }
  catch { throw new Error(`下载 ${name} 失败`); }
  if (response.status !== 200) throw new Error(`${name} 下载 HTTP ${response.status}（链接可能已过期）`);
  if (!response.arrayBuffer || response.arrayBuffer.byteLength !== data.size || data.size > MAX_BYTES) {
    throw new Error(`${name} 下载大小不匹配`);
  }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(response.arrayBuffer); }
  catch { throw new Error(`${name} 编码无效`); }
}

async function localFingerprint(host: DevBuildHost): Promise<string | null> {
  const base = normalizePath(`${host.app.vault.configDir}/plugins/${host.manifest.id}`);
  const files = {} as DevBuildContents;
  for (const name of DEV_BUILD_FILES) {
    const path = `${base}/${name}`;
    if (!(await host.app.vault.adapter.exists(path))) return null;
    files[name] = await host.app.vault.adapter.read(path);
  }
  try { validateDevBuild(files, host.manifest.id); }
  catch { return null; }
  return buildFingerprint(files);
}

/** Single public operation: check latest, download changed files and safely install. */
export async function updateFromVika(host: DevBuildHost): Promise<void> {
  return withDevBuildLock(async () => {
    const token = credential();
    const remote = await newest(token);
    const uploadTime = new Date(remote.time).toLocaleString('zh-CN');
    if (await localFingerprint(host) === remote.fingerprint) {
      new Notice(`维格表已是最新构建（上传：${uploadTime}）`);
      return;
    }
    const cloud = await pinned(token, remote.id); // refresh expiring attachment links
    if (cloud.fingerprint !== remote.fingerprint) throw new Error('云端构建已变化，请重新操作');
    const downloaded = {} as DevBuildContents;
    for (const name of DEV_BUILD_FILES) {
      try { downloaded[name] = await getAttachment(name, cloud.files[name]); }
      catch (error) {
        // Retry once with a newly issued URL if the attachment link expired.
        const refreshed = await pinned(token, remote.id);
        if (refreshed.fingerprint !== cloud.fingerprint) throw new Error('云端构建已变化，请重新操作');
        try { downloaded[name] = await getAttachment(name, refreshed.files[name]); }
        catch { throw error; }
      }
    }
    if (validateDevBuild(downloaded, host.manifest.id) !== remote.version
      || await buildFingerprint(downloaded) !== remote.fingerprint) {
      throw new Error('下载文件与云端构建指纹不一致，未覆盖本地文件');
    }
    await installDevBuild(host, downloaded);
    new Notice(`Think OS 已安装维格表构建 ${remote.fingerprint.slice(0, 12)}\n上传：${uploadTime}\n请完全退出并重启 Obsidian`, 0);
  });
}
