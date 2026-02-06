/* src/core/services/types.ts */
import type { InjectionToken } from 'tsyringe';
import type { ThinkSettings } from '@/core/types/schema';

// [Phase2] Obsidian App 类型不应进入 core。
// - Token 仍然存在（供 platform/app 组合根注册/注入）
// - 这里将类型降级为 unknown，避免 core import 'obsidian'
export const AppToken: InjectionToken<unknown> = "App";

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
