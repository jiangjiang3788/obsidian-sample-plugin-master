// src/features/settings/index.ts
import { App } from 'obsidian';
import type ThinkPlugin from '@main';
import { SettingsTab } from './SettingsTab';
import { AppStore } from '@/app/AppStore'; // [新增]

// 导出设置组件
export { LayoutSettings } from './LayoutSettings';
export { InputSettings } from './InputSettings';
export { GeneralSettings } from './GeneralSettings';

// [修改] 依赖项接口
export interface SettingsDependencies {
    app: App;
    plugin: ThinkPlugin;
    appStore: AppStore; // 新增
}

/**
 * [修改] setup 函数现在接收 appStore
 */
export function setup(deps: SettingsDependencies): void {
    // SettingsTab 构造函数不变，它可以通过 plugin 实例访问到 appStore
    deps.plugin.addSettingTab(new SettingsTab(deps.app, deps.plugin));
}
