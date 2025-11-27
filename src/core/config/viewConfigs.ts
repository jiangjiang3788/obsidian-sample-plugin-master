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

/**
 * EventTimelineView 默认配置（供视图 + 编辑器复用）
 */
export interface EventTimelineViewConfig {
    timeField: string;
    titleField: string;
    contentField: string;
    groupByDay: boolean;
    showWeekday: boolean;
    maxContentLength: number;
    fields: string[];
    groupFields: string[];
}

export const EVENT_TIMELINE_VIEW_DEFAULT_CONFIG: EventTimelineViewConfig = {
    timeField: 'date',
    titleField: 'title',
    contentField: 'content',
    groupByDay: true,
    showWeekday: true,
    maxContentLength: 160,
    fields: ['title', 'date'],
    groupFields: [],
};

/**
 * 导出配置（供 exportUtils 使用）
 */
export interface ExportViewConfig {
    // 分组：例如 'filename' / 'date' / 'header' 等
    groupField?: string;            // 用于生成 "## 分组名"
    groupTitlePrefix?: string;      // 可选，比如空字符串
    useMarkdownHeadingForGroup: boolean; // 是否用 '## '

    // 每个记录的结构
    idTemplate: string;             // 例如 'ID {{index}}/{{filename}}#{{id}}'
    detailFields: string[];         // e.g. ['categoryKey', 'date', 'rating', 'pintu', 'content']

    // 字段标签映射（中文标签）
    fieldLabels: Record<string, string>; // { categoryKey: '分类', date: '日期', rating: '评分', pintu: '评图', content: '内容' }
}

export const BLOCK_EXPORT_DEFAULT_CONFIG: ExportViewConfig = {
    groupField: 'filename',                // 先按文件分组
    groupTitlePrefix: '',                  // 目前不用前缀
    useMarkdownHeadingForGroup: true,      // 用 '## filename'
    idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
    detailFields: ['categoryKey', 'date', 'rating', 'pintu', 'content'],
    fieldLabels: {
        categoryKey: '分类',
        date: '日期',
        rating: '评分',
        pintu: '评图',
        content: '内容',
    },
};

/**
 * EventTimelineView 导出配置
 */
export const EVENT_TIMELINE_EXPORT_CONFIG: ExportViewConfig = {
    groupField: 'date',                    // 按日期分组
    groupTitlePrefix: '',                  
    useMarkdownHeadingForGroup: true,      // 用 '## date'
    idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
    detailFields: ['title', 'date', 'categoryKey', 'content'],
    fieldLabels: {
        title: '标题',
        date: '日期',
        categoryKey: '分类',
        content: '内容',
    },
};

/**
 * ExcelView 导出配置
 */
export const EXCEL_EXPORT_CONFIG: ExportViewConfig = {
    groupField: 'categoryKey',             // 按分类分组
    groupTitlePrefix: '',                  
    useMarkdownHeadingForGroup: true,      // 用 '## categoryKey'
    idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
    detailFields: ['title', 'date', 'categoryKey', 'content'],
    fieldLabels: {
        title: '标题',
        date: '日期',
        categoryKey: '分类',
        content: '内容',
    },
};

/**
 * StatisticsView 导出配置 - 默认按Category分类
 */
export const STATISTICS_EXPORT_CONFIG: ExportViewConfig = {
    groupField: 'categoryKey',             // 按分类分组
    groupTitlePrefix: '',                  
    useMarkdownHeadingForGroup: true,      // 用 '## categoryKey'
    idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
    detailFields: ['title', 'date', 'categoryKey', 'period', 'content'],
    fieldLabels: {
        title: '标题',
        date: '日期',
        categoryKey: '分类',
        period: '周期',
        content: '内容',
    },
};

/**
 * HeatmapView 导出配置
 */
export const HEATMAP_EXPORT_CONFIG: ExportViewConfig = {
    groupField: 'date',                    // 按日期分组
    groupTitlePrefix: '',                  
    useMarkdownHeadingForGroup: true,      // 用 '## date'
    idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
    detailFields: ['date', 'categoryKey', 'rating', 'content'],
    fieldLabels: {
        date: '日期',
        categoryKey: '分类',
        rating: '评分',
        content: '内容',
    },
};

/**
 * TimelineView 导出配置
 */
export const TIMELINE_EXPORT_CONFIG: ExportViewConfig = {
    groupField: 'filename',                // 按文件分组
    groupTitlePrefix: '',                  
    useMarkdownHeadingForGroup: true,      // 用 '## filename'
    idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
    detailFields: ['title', 'startTime', 'endTime', 'duration', 'categoryKey', 'content'],
    fieldLabels: {
        title: '标题',
        startTime: '开始时间',
        endTime: '结束时间',
        duration: '时长',
        categoryKey: '分类',
        content: '内容',
    },
};

/**
 * TableView 导出配置
 */
export const TABLE_EXPORT_CONFIG: ExportViewConfig = {
    groupField: 'categoryKey',             // 按分类分组
    groupTitlePrefix: '',                  
    useMarkdownHeadingForGroup: true,      // 用 '## categoryKey'
    idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
    detailFields: ['title', 'date', 'categoryKey', 'content'],
    fieldLabels: {
        title: '标题',
        date: '日期',
        categoryKey: '分类',
        content: '内容',
    },
};
