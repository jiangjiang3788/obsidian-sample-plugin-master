// src/core/settings/index.ts
import { SettingsTab } from './ui/SettingsTab';
import type { ThinkContext } from '../../main';

/** 让外部能 import SettingsTab (虽然在此次重构中非必须，但保持是一种好习惯) */
export * from './ui/SettingsTab';

/**
 * 由 main.ts 统一调用：注册 SettingTab。
 * 相当于以前的 `plugin.addSettingTab(new SettingsTab(...))`。
 */
export function setup(ctx: ThinkContext): void {
  ctx.plugin.addSettingTab(new SettingsTab(ctx.app, ctx.plugin));
}