/* src/core/services/types.ts */
import type { InjectionToken } from 'tsyringe';
import type { ThinkSettings } from '@lib/domain';
import type { App } from 'obsidian';

// [核心修改] 为 Obsidian App 实例创建一个注入令牌 (Token)
export const AppToken: InjectionToken<App> = "App";

// [核心修改] 为 ThinkSettings 对象创建一个注入令牌
export const SETTINGS_TOKEN: InjectionToken<ThinkSettings> = "ThinkSettings";

// 定义 ActionService 返回的快速输入配置对象的结构
export interface QuickInputConfig {
    blockId: string;
    context?: Record<string, any>;
    themeId?: string;
}
