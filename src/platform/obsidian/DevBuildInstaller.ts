/** The GitHub and Vika channels share this installer and its process-wide lock. */
import { normalizePath } from 'obsidian';

export const DEV_BUILD_FILES = ['main.js', 'styles.css', 'manifest.json'] as const;
export type DevBuildFile = (typeof DEV_BUILD_FILES)[number];
export type DevBuildContents = Record<DevBuildFile, string>;

export interface DevBuildAdapter {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<string>;
  write(path: string, data: string): Promise<void>;
  remove?(path: string): Promise<void>;
}
export interface DevBuildHost {
  app: { vault: { configDir: string; adapter: DevBuildAdapter } };
  manifest: { id: string };
}

let installInProgress = false;
export async function withDevBuildInstallLock<T>(action: () => Promise<T>): Promise<T> {
  if (installInProgress) throw new Error('Think OS 开发版正在下载或安装，请勿重复操作');
  installInProgress = true;
  try { return await action(); }
  finally { installInProgress = false; }
}

/** Validate all input before writing any local file. */
export function validateDevBuild(contents: DevBuildContents, expectedPluginId: string): string {
  for (const file of DEV_BUILD_FILES) {
    const content = contents[file];
    if (typeof content !== 'string' || !content.trim()) throw new Error(`${file} 内容为空`);
    if (/^\s*<(?:!doctype|html)/i.test(content)) throw new Error(`${file} 返回网页内容`);
  }
  if (contents['main.js'].length < 1000) throw new Error('main.js 内容异常，已停止覆盖');
  if (contents['styles.css'].length < 100) throw new Error('styles.css 内容异常，已停止覆盖');
  let manifest: Record<string, unknown>;
  try { manifest = JSON.parse(contents['manifest.json']) as Record<string, unknown>; }
  catch { throw new Error('manifest.json 不是有效 JSON'); }
  if (manifest?.id !== expectedPluginId) throw new Error(`插件 ID 不匹配：${String(manifest?.id || 'unknown')}`);
  if (manifest?.main && manifest.main !== 'main.js') throw new Error('manifest.json 的 main 字段异常');
  if (manifest?.styles && manifest.styles !== 'styles.css') throw new Error('manifest.json 的 styles 字段异常');
  if (typeof manifest?.version !== 'string' || !manifest.version.trim()) throw new Error('manifest.json 版本号缺失');
  return manifest.version.trim();
}

type Backups = Record<DevBuildFile, string | null>;
async function backupsOf(adapter: DevBuildAdapter, dir: string): Promise<Backups> {
  const entries = await Promise.all(DEV_BUILD_FILES.map(async (file) => {
    const path = `${dir}/${file}`;
    return [file, await adapter.exists(path) ? await adapter.read(path) : null] as const;
  }));
  const backups = Object.fromEntries(entries) as Backups;
  if (DEV_BUILD_FILES.some(file => backups[file] === null) && !adapter.remove) {
    throw new Error('插件文件缺失且当前存储不支持回滚删除，已停止覆盖');
  }
  return backups;
}

/** Write manifest last. A failed write can have partially modified the file. */
export async function installDevBuild(host: DevBuildHost, contents: DevBuildContents): Promise<void> {
  validateDevBuild(contents, host.manifest.id);
  const dir = normalizePath(`${host.app.vault.configDir}/plugins/${host.manifest.id}`);
  const adapter = host.app.vault.adapter;
  const backups = await backupsOf(adapter, dir);
  const touched: DevBuildFile[] = [];
  try {
    for (const file of DEV_BUILD_FILES) {
      touched.push(file);
      const path = `${dir}/${file}`;
      await adapter.write(path, contents[file]);
      if (await adapter.read(path) !== contents[file]) throw new Error(`${file} 写入校验失败`);
    }
  } catch (error) {
    const failed: DevBuildFile[] = [];
    for (const file of touched.reverse()) {
      try {
        const path = `${dir}/${file}`;
        if (backups[file] === null) await adapter.remove!(path);
        else await adapter.write(path, backups[file]!);
      } catch { failed.push(file); }
    }
    const message = error instanceof Error ? error.message : String(error);
    if (failed.length) throw new Error(`${message}；回滚 ${failed.join('、')} 失败，请从备份恢复`);
    throw new Error(`${message}；已回滚到原版本`);
  }
}
