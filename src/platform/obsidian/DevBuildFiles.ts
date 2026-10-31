import { normalizePath } from 'obsidian';

export const DEV_BUILD_FILES = ['main.js', 'styles.css', 'manifest.json'] as const;
export type DevBuildFile = (typeof DEV_BUILD_FILES)[number];
export type DevBuildContents = Record<DevBuildFile, string>;

export interface DevBuildHost {
  app: { vault: { configDir: string; adapter: {
    exists(path: string): Promise<boolean>;
    read(path: string): Promise<string>;
    write(path: string, data: string): Promise<void>;
    remove?(path: string): Promise<void>;
  } } };
  manifest: { id: string };
}

let installing = false;
export async function withDevBuildLock<T>(work: () => Promise<T>): Promise<T> {
  if (installing) throw new Error('Think OS 开发版正在下载或安装，请勿重复操作');
  installing = true;
  try { return await work(); }
  finally { installing = false; }
}

export async function buildFingerprint(files: DevBuildContents): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('当前 Obsidian 无法进行 SHA-256 校验');
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [encoder.encode('think-os-build-v1\0')];
  for (const name of DEV_BUILD_FILES) {
    const bytes = encoder.encode(files[name]);
    parts.push(encoder.encode(`${name}\0${bytes.byteLength}\0`), bytes, encoder.encode('\0'));
  }
  const all = new Uint8Array(parts.reduce((total, bytes) => total + bytes.byteLength, 0));
  let offset = 0;
  for (const part of parts) { all.set(part, offset); offset += part.byteLength; }
  const digest = await crypto.subtle.digest('SHA-256', all as BufferSource);
  return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
}

export function validateDevBuild(files: DevBuildContents, expectedId: string): string {
  for (const name of DEV_BUILD_FILES) {
    const text = files[name];
    if (typeof text !== 'string' || !text.trim()) throw new Error(`${name} 内容为空`);
    if (/^\s*<(?:!doctype|html)/i.test(text)) throw new Error(`${name} 返回了网页内容`);
  }
  if (files['main.js'].length < 1000 || files['styles.css'].length < 100) {
    throw new Error('下载的插件文件大小异常，已停止覆盖');
  }
  let manifest: { id?: string; main?: string; styles?: string; version?: string };
  try { manifest = JSON.parse(files['manifest.json']); }
  catch { throw new Error('远端 manifest.json 不是有效 JSON'); }
  if (manifest.id !== expectedId) throw new Error(`远端插件 ID 不匹配：${String(manifest.id || 'unknown')}`);
  if (manifest.main && manifest.main !== 'main.js') throw new Error('manifest.json main 字段异常');
  if (manifest.styles && manifest.styles !== 'styles.css') throw new Error('manifest.json styles 字段异常');
  if (typeof manifest.version !== 'string' || !manifest.version.trim()) throw new Error('manifest.json 版本号缺失');
  return manifest.version.trim();
}

export async function installDevBuild(host: DevBuildHost, files: DevBuildContents): Promise<void> {
  validateDevBuild(files, host.manifest.id);
  const adapter = host.app.vault.adapter;
  const dir = normalizePath(`${host.app.vault.configDir}/plugins/${host.manifest.id}`);
  const backups = {} as Record<DevBuildFile, string | null>;
  for (const name of DEV_BUILD_FILES) {
    const path = `${dir}/${name}`;
    backups[name] = await adapter.exists(path) ? await adapter.read(path) : null;
  }
  if (DEV_BUILD_FILES.some(name => backups[name] === null) && !adapter.remove) {
    throw new Error('本地文件缺失，当前存储不支持回滚删除，已停止更新');
  }
  const touched: DevBuildFile[] = [];
  try {
    for (const name of DEV_BUILD_FILES) {
      touched.push(name);
      const path = `${dir}/${name}`;
      await adapter.write(path, files[name]);
      if (await adapter.read(path) !== files[name]) throw new Error(`${name} 写入校验失败`);
    }
  } catch (error) {
    const rollbackFailed: string[] = [];
    for (const name of touched.reverse()) {
      const path = `${dir}/${name}`;
      try {
        if (backups[name] === null) await adapter.remove!(path);
        else await adapter.write(path, backups[name]!);
      } catch { rollbackFailed.push(name); }
    }
    const reason = error instanceof Error ? error.message : String(error);
    if (rollbackFailed.length) throw new Error(`${reason}；回滚 ${rollbackFailed.join('、')} 失败，请手动恢复备份`);
    throw new Error(`${reason}；已回滚到原版本`);
  }
}
