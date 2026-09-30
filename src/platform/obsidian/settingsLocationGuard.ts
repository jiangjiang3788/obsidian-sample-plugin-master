import type { App } from 'obsidian';
import { THINK_STORAGE_PATHS } from '@/core/services/StorageService';

/** Detect, do not silently migrate or prefer a random same-named data file. */
export async function assertSettingsLocationSafe(app: App, pluginDirectory: string): Promise<void> {
  const canonical = THINK_STORAGE_PATHS.settings;
  const legacy = `${pluginDirectory.replace(/\/$/, '')}/data.json`;
  if (legacy === canonical) return;
  if (await app.vault.adapter.exists(canonical)) return;
  if (await app.vault.adapter.exists(legacy)) {
    throw new Error(`settings_location_conflict: 当前读取 ${canonical}，但仅发现 ${legacy}。已停止初始化，原文件未改动。请备份两处文件并使用只读诊断确认，再显式导入；不要创建空配置。`);
  }
}
