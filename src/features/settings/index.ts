// src/features/settings/index.ts
// [注意] 此文件已从 src/core/settings/ 移动到新位置

// [修改] 更新导入路径以反映文件的新位置
import { SettingsTab } from './ui/SettingsTab';
import type { ThinkContext } from '../../main';

export * from './ui/SettingsTab';

/**
 * 由 main.ts 统一调用：注册 SettingTab。
 */
export function setup(ctx: ThinkContext): void {
    ctx.plugin.addSettingTab(new SettingsTab(ctx.app, ctx.plugin));
}