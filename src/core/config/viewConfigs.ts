// src/core/config/viewConfigs.ts
// 跨 Feature 的视图配置，避免 features 间的直接依赖

/**
 * StatisticsView 的默认配置
 * 从 features/settings 移动到 core，符合依赖约束规范
 */
export const STATISTICS_VIEW_DEFAULT_CONFIG = {
    categories: [] as { name: string; color: string; alias?: string; }[],
    displayMode: 'smart' as 'linear' | 'logarithmic' | 'smart',
    minVisibleHeight: 15, // 最小可见高度百分比
    usePeriodField: false, // 是否使用周期字段过滤
};

/**
 * 其他视图的默认配置可以在这里添加
 * 例如：
 * export const TIMELINE_VIEW_DEFAULT_CONFIG = {...}
 * export const HEATMAP_VIEW_DEFAULT_CONFIG = {...}
 */
