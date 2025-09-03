// src/core/services/types.ts

// 定义 ActionService 返回的快速输入配置对象的结构
export interface QuickInputConfig {
    blockId: string;
    context?: Record<string, any>;
    themeId?: string;
}