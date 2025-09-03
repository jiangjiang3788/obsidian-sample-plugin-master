// src/features/settings/index.ts
import type { App } from 'obsidian'; // [新增] 导入 App 类型
import type { ThinkPlugin } from '../../main'; // [新增] 导入 ThinkPlugin 类型
import { SettingsTab } from './ui/SettingsTab';

// [新增] 定义 Settings 功能的依赖项
export interface SettingsDependencies {
    app: App;
    plugin: ThinkPlugin;
}

/**
 * [修改] setup 函数接收明确的依赖对象
 */
export function setup(deps: SettingsDependencies): void {
    deps.plugin.addSettingTab(new SettingsTab(deps.app, deps.plugin));
}