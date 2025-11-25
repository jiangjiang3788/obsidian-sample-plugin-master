/* src/core/services/types.ts */
import type { InjectionToken } from 'tsyringe';
import type { ThinkSettings } from '@/core/types/schema';
import type { App } from 'obsidian';

// [核心修改] 为 Obsidian App 实例创建一个注入令牌 (Token)
export const AppToken: InjectionToken<App> = "App";

// [核心修改] 为 ThinkSettings 对象创建一个注入令牌
export const SETTINGS_TOKEN: InjectionToken<ThinkSettings> = "ThinkSettings";

// [新增] 设置提供者接口，用于解耦 Core 和 App
export interface ISettingsProvider {
    getSettings(): ThinkSettings;
}

// [新增] 设置提供者 Token
export const SettingsProviderToken: InjectionToken<ISettingsProvider> = "SettingsProvider";

// 定义 ActionService 返回的快速输入配置对象的结构
export interface QuickInputConfig {
    blockId: string;
    context?: Record<string, any>;
    themeId?: string;
}
