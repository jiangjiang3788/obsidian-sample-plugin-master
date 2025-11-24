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
 * HeatmapView 默认配置（供视图 + 编辑器复用）
 */
export interface HeatmapViewConfig {
    displayMode: 'habit' | 'count';
    sourceBlockId: string;
    themePaths: string[];
    enableLeveling: boolean;
    maxDailyChecks: number;
    allowManualEdit: boolean;
    showLevelProgress: boolean;
}

export const HEATMAP_VIEW_DEFAULT_CONFIG: HeatmapViewConfig = {
    displayMode: 'habit',
    sourceBlockId: '',
    themePaths: [],
    enableLeveling: true,
    maxDailyChecks: 10,
    allowManualEdit: true,
    showLevelProgress: true,
};

/**
 * TableView 默认配置（供视图 + 编辑器复用）
 */
export interface TableViewConfig {
    view: 'TableView';
    title: string;
    collapsed: boolean;
    rowField: string;
    colField: string;
}

export const TABLE_VIEW_DEFAULT_CONFIG: TableViewConfig = {
    view: 'TableView',
    title: '表格视图',
    collapsed: false,
    rowField: 'categoryKey',
    colField: 'date',
};

/**
 * TimelineView 默认配置（供视图 + 编辑器复用）
 */
export interface CategoryConfig {
    name?: string;
    color: string;
    files: string[];
}

export interface TimelineViewConfig {
    defaultHourHeight: number;
    MAX_HOURS_PER_DAY: number;
    UNTRACKED_LABEL: string;
    categories: Record<string, CategoryConfig>;
    progressOrder: string[];
}

export const TIMELINE_VIEW_DEFAULT_CONFIG: TimelineViewConfig = {
    defaultHourHeight: 50,
    MAX_HOURS_PER_DAY: 24,
    UNTRACKED_LABEL: "未记录",
    categories: {
        "工作": { color: "#60a5fa", files: ["工作", "Work"] },
        "学习": { color: "#34d399", files: ["学习", "Study"] },
        "生活": { color: "#fbbf24", files: ["生活", "Life"] },
    },
    progressOrder: ["工作", "学习", "生活"],
};

/**
 * BlockView 默认配置（供视图 + 编辑器复用）
 */
export interface BlockViewConfig {
    view: 'BlockView';
    title: string;
    collapsed: boolean;
    fields: string[];
    group: string;
}

export const BLOCK_VIEW_DEFAULT_CONFIG: BlockViewConfig = {
    view: 'BlockView',
    title: '块视图',
    collapsed: false,
    fields: [],
    group: 'categoryKey',
};

/**
 * ExcelView 默认配置（供视图 + 编辑器复用）
 */
export interface ExcelViewConfig {
    view: 'ExcelView';
    title: string;
    collapsed: boolean;
    fields: string[];
}

export const EXCEL_VIEW_DEFAULT_CONFIG: ExcelViewConfig = {
    view: 'ExcelView',
    title: '数据表格',
    collapsed: false,
    fields: [],
};
