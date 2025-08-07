import { SettingsTab } from './ui/SettingsTab';
import type { App } from 'obsidian';
import type ThinkPlugin from '../../main';

/**
 * Feature 的“依赖注入”上下⽂。
 * 这里只放这三个字段就够用了；如果以后要加 dataStore / platform，
 * 同样在 ThinkContext 和这里传进去即可。
 */
export interface ThinkContext {
  app: App;
  plugin: ThinkPlugin;
}

/** 让其它 Feature（或 main.ts）能继续 import SettingsTab */
export * from './ui/SettingsTab';

/**
 * 由 main.ts 统一调用：注册 SettingTab。
 * 相当于以前的 `plugin.addSettingTab(new SettingsTab(...))`。
 */
export function setup(ctx: ThinkContext): void {
  ctx.plugin.addSettingTab(new SettingsTab(ctx.app, ctx.plugin));
}
