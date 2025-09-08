// src/core/services/types.ts

// [新增] 为 Obsidian App 实例创建一个注入令牌 (Token)
// 这是一个唯一的标识符，用于在容器中注册和解析 App 实例。
export const AppToken = "App";

// 定义 ActionService 返回的快速输入配置对象的结构
export interface QuickInputConfig {
    blockId: string;
    context?: Record<string, any>;
    themeId?: string;
}