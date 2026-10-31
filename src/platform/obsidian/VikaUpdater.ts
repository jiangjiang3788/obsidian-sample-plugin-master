import { App, Modal, Notice, Setting, normalizePath, requestUrl } from 'obsidian';
import { container } from 'tsyringe';
import { SettingsRepository } from '@core/services/public';
import {
  DEV_BUILD_FILES, buildFingerprint, installDevBuild, validateDevBuild, withDevBuildLock,
  type DevBuildContents, type DevBuildFile, type DevBuildHost,
} from './DevBuildFiles';

const API = 'https://vika.cn/fusion/v1/datasheets/dstoKKbqk6Rv7E3vhy/records';
const FIELDS = { version: '版本号', build: '构建ID', time: '上传时间' } as const;
const MAX_BYTES = 40 * 1024 * 1024;
type Attachment = { url: string; size: number; token: string };
type CloudBuild = { id: string; version: string; fingerprint: string; time: number; files: Record<DevBuildFile, Attachment> };

function credential(): string {
  const value = container.resolve(SettingsRepository).getSettings().vikaApiToken?.trim();
  if (!value) throw new Error('请在 Think OS 设置的维格表更新区域填写 API 令牌');
  return value;
}

export function openVikaTokenDialog(app: App): void {
  new (class extends Modal {
    onOpen(): void {
      this.modalEl.addClass('think-vika-token-modal');
      let value = '';
      this.contentEl.createEl('h3', { text: '维格表 API 令牌' });
      new Setting(this.contentEl).setName('令牌').addText(text => {
        text.inputEl.type = 'password';
        text.inputEl.autocomplete = 'off';
        text.setPlaceholder('输入维格表令牌').onChange(next => { value = next; });
      });
      new Setting(this.contentEl).addButton(button => button.setButtonText('保存').setCta().onClick(async () => {
        if (!value.trim() || /\s/.test(value)) { new Notice('令牌不能为空或含有空白字符'); return; }
        try {
          await container.resolve(SettingsRepository).update(draft => { draft.vikaApiToken = value.trim(); });
          this.close();
        } catch (error) {
          new Notice(`保存令牌失败：${error instanceof Error ? error.message : String(error)}`, 10000);
        }
      }));
    }
    onClose(): void { this.contentEl.empty(); }
  })(app).open();
}

async function rows(token: string, params: URLSearchParams): Promise<any[]> {
  let response: Awaited<ReturnType<typeof requestUrl>>;
  try {
    response = await requestUrl({
      url: `${API}?${params}`, method: 'GET', throw: false,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Cache-Control': 'no-cache' },
    });
  } catch { throw new Error('维格表连接失败，请检查网络'); }
  if (response.status !== 200) throw new Error(`维格表 API HTTP ${response.status}`);
  let body: any;
  try { body = JSON.parse(response.text); }
  catch { throw new Error('维格表返回的内容不是 JSON'); }
  if (!body?.success || body.code !== 200 || !Array.isArray(body.data?.records)) {
    throw new Error(`维格表 API 错误：${String(body?.message ?? body?.code ?? '未知错误').slice(0, 80)}`);
  }
  return body.data.records;
}

function parse(row: any): CloudBuild | null {
  const f = row?.fields;
  if (!f || typeof row.recordId !== 'string' || typeof f[FIELDS.version] !== 'string'
    || typeof f[FIELDS.build] !== 'string' || !/^[a-f0-9]{64}$/i.test(f[FIELDS.build])
    || !Number.isFinite(f[FIELDS.time])) return null;
  const files = {} as CloudBuild['files'];
  for (const name of DEV_BUILD_FILES) {
    const items = f[name];
    const item = Array.isArray(items) && items.length === 1 ? items[0] : null;
    if (typeof item?.url !== 'string' || typeof item?.token !== 'string'
      || !Number.isSafeInteger(item?.size) || item.size < 1 || item.size > MAX_BYTES) return null;
    files[name] = item;
  }
  return { id: row.recordId, version: f[FIELDS.version], fingerprint: f[FIELDS.build].toLowerCase(),
    time: f[FIELDS.time], files };
}

async function latest(token: string): Promise<CloudBuild> {
  const params = new URLSearchParams({ pageSize: '100', pageNum: '1' });
  params.append('sort[][field]', FIELDS.time);
  params.append('sort[][order]', 'desc');
  const valid = (await rows(token, params)).map(parse).filter((r): r is CloudBuild => r !== null);
  if (!valid.length) throw new Error('维格表中没有完整的三文件构建记录');
  valid.sort((a, b) => b.time - a.time);
  return valid[0];
}

async function pinned(token: string, id: string): Promise<CloudBuild> {
  await new Promise(resolve => setTimeout(resolve, 1100));
  const row = (await rows(token, new URLSearchParams({ recordIds: id }))).find(item => item.recordId === id);
  const build = parse(row);
  if (!build) throw new Error('维格表构建记录发生变化');
  return build;
}

function safeUrl(link: string): string {
  let url: URL;
  try { url = new URL(link); }
  catch { throw new Error('附件下载地址无效'); }
  if (url.protocol !== 'https:' || url.username || url.password
    || !/(^|\.)(vika\.cn|vika\.com|aitable\.ai|apitable\.com|apitable\.cn)$/.test(url.hostname.toLowerCase())) {
    throw new Error('附件下载域名不符合预期');
  }
  return url.href;
}

async function download(name: DevBuildFile, item: Attachment): Promise<string> {
  let response: Awaited<ReturnType<typeof requestUrl>>;
  try { response = await requestUrl({ url: safeUrl(item.url), method: 'GET', throw: false }); }
  catch { throw new Error(`下载 ${name} 失败`); }
  if (response.status !== 200) throw new Error(`${name} 下载 HTTP ${response.status}`);
  if (!response.arrayBuffer || response.arrayBuffer.byteLength !== item.size) throw new Error(`${name} 文件大小与云端不一致`);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(response.arrayBuffer); }
  catch { throw new Error(`${name} 不是有效的 UTF-8 文件`); }
}

async function localFingerprint(host: DevBuildHost): Promise<string | null> {
  const folder = normalizePath(`${host.app.vault.configDir}/plugins/${host.manifest.id}`);
  const files = {} as DevBuildContents;
  for (const name of DEV_BUILD_FILES) {
    const path = `${folder}/${name}`;
    if (!(await host.app.vault.adapter.exists(path))) return null;
    files[name] = await host.app.vault.adapter.read(path);
  }
  try { validateDevBuild(files, host.manifest.id); }
  catch { return null; }
  return buildFingerprint(files);
}

export async function updateFromVika(host: DevBuildHost): Promise<boolean> {
  return withDevBuildLock(async () => {
    const token = credential();
    const newest = await latest(token);
    if (await localFingerprint(host) === newest.fingerprint) return false;
    const cloud = await pinned(token, newest.id);
    if (cloud.fingerprint !== newest.fingerprint) throw new Error('云端构建已变化，请重试');
    const contents = {} as DevBuildContents;
    for (const name of DEV_BUILD_FILES) {
      try { contents[name] = await download(name, cloud.files[name]); }
      catch (error) {
        const refreshed = await pinned(token, newest.id);
        if (refreshed.fingerprint !== cloud.fingerprint) throw new Error('云端构建已变化，请重试');
        try { contents[name] = await download(name, refreshed.files[name]); }
        catch { throw error; }
      }
    }
    if (validateDevBuild(contents, host.manifest.id) !== cloud.version
      || await buildFingerprint(contents) !== cloud.fingerprint) {
      throw new Error('云端文件校验失败，未覆盖本地插件');
    }
    await installDevBuild(host, contents);
    return true;
  });
}
