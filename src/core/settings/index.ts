// src/core/settings/index.ts
import { SettingsTab } from './ui/SettingsTab';
import type { ThinkContext } from '../../main';

export * from './ui/SettingsTab';

/**
 * 由 main.ts 统一调用：注册 SettingTab。
 */
export function setup(ctx: ThinkContext): void { // ctx 参数现在接收的是 ThinkPlugin 的实例
    ctx.plugin.addSettingTab(new SettingsTab(ctx.app, ctx.plugin));
}