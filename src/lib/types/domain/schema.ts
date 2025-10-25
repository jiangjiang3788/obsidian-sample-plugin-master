// src/core/domain/schema.ts
import type { RecurrenceInfo } from '@lib/utils/core/mark';

// [新增] 定义可分组项的通用接口
export interface Groupable {
    id: string;
    parentId: string | null;
}

// [修改] 定义分组的类型 - 移除 dataSource
export type GroupType = 'viewInstance' | 'layout';
export interface Group extends Groupable {
    name: string;
    type: GroupType;
    // [新增] 用于UI状态，表示分组是否折叠
    collapsed?: boolean;
}

// [修改] 将插件的顶层设置接口和默认值移到此处，使其成为领域模型的一部分
export interface ThinkSettings {
    // [新增] 统一存储所有分组
    groups: Group[];
    viewInstances: ViewInstance[];
    layouts: Layout[];
    inputSettings: InputSettings;
    // [新增] 悬浮计时器设置
    floatingTimerEnabled: boolean;
    // [新增] 激活的主题路径
    activeThemePaths?: string[];
}

export const DEFAULT_SETTINGS: ThinkSettings = {
    groups: [],
    viewInstances: [],
    layouts: [],
    inputSettings: { blocks: [], themes: [], overrides: [] },
    // [新增] 悬浮计时器默认启用
    floatingTimerEnabled: true,
    // [新增]
    activeThemePaths: [],
};


// ----- [重构后] 快速输入设置 (Input Settings) ----- //
// ... 此部分无变化 ...
export interface TemplateFieldOption {
    value: string;
    label?: string;
}
export interface TemplateField {
    id: string;
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'date' | 'time' | 'select' | 'radio' | 'number' | 'rating';
    defaultValue?: string;
    options?: TemplateFieldOption[];
    min?: number;
    max?: number;
}
export interface BlockTemplate {
    id: string;
    name: string;
    fields: TemplateField[];
    outputTemplate: string;
    targetFile: string;
    appendUnderHeader?: string;
}
export interface ThemeDefinition {
    id: string;
    path: string;
    icon?: string;
}
export interface ThemeOverride {
    id: string;
    blockId: string;
    themeId: string;
    disabled?: boolean;
    fields?: TemplateField[];
    outputTemplate?: string;
    targetFile?: string;
    appendUnderHeader?: string;
}
export interface InputSettings {
    blocks: BlockTemplate[];
    themes: ThemeDefinition[];
    overrides: ThemeOverride[];
}

// ----- 视图与布局定义 (保持不变) ----- //

// [MODIFIED] 添加 HeatmapView
export const VIEW_OPTIONS = ['BlockView', 'TableView', 'ExcelView', 'TimelineView', 'StatisticsView', 'HeatmapView'] as const;
export type ViewName = typeof VIEW_OPTIONS[number];

// [修改] 实现 Groupable 接口，整合数据源功能
export interface ViewInstance extends Groupable {
    title: string;
    viewType: ViewName;
    dataSourceId?: string; // [废弃] 保留用于向后兼容，新视图不再使用
    collapsed?: boolean;
    fields?: string[];
    group?: string;
    viewConfig?: Record<string, any>;
    actions?: ActionConfig[];
    // [新增] 整合数据源的筛选和排序功能
    filters?: FilterRule[];
    sort?: SortRule[];
}

// [修改] 实现 Groupable 接口
export interface Layout extends Groupable {
    name: string;
    viewInstanceIds: string[];
    hideToolbar?: boolean;
    initialView?: string;
    initialDate?: string;
    initialDateFollowsNow?: boolean;
    isOverviewMode?: boolean; // [新增] 概览模式开关
    useFieldGranularity?: boolean; // [新增] 按字段粒度过滤开关
    selectedThemes?: string[]; // [新增] 选中的主题路径列表，用于主题筛选
    displayMode?: 'list' | 'grid';
    gridConfig?: {
        columns?: number;
    };
}
// ... 文件其余部分无变化 ...
export interface ActionConfig {
    id: string;
    label: string;
    type: 'create_item';
    targetFile: string;
    template: string;
    promptedFields: {
        key: string;
        label: string;
        type: 'text' | 'textarea' | 'select';
        options?: string[];
    }[];
}
export interface FilterRule {
    field: string;
    op: '=' | '!=' | 'includes' | 'regex' | '>' | '<';
    value: any;
}
export interface SortRule {
    field: string;
    dir: 'asc' | 'desc';
}
export interface Item {
    id: string;
    title: string;
    content: string;
    type: 'task' | 'block';
    tags: string[];
    theme?: string;     // [新增] 主题字段，用于统一的主题管理
    categoryKey: string;
    recurrence: string;
    recurrenceInfo?: RecurrenceInfo;
    startISO?: string;
    endISO?: string;
    startMs?: number;
    endMs?: number;
    date?: string;
    dateMs?: number;
    dateSource?: 'done' | 'due' | 'scheduled' | 'start' | 'created' | 'end' | 'block';
    created: number;
    modified: number;
    filename?: string;
    header?: string;
    icon?: string;
    priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest';
    extra: Record<string, string | number | boolean>;
    createdDate?: string;
    scheduledDate?: string;
    startDate?: string;
    dueDate?: string;
    doneDate?: string;
    cancelledDate?: string;
    file?: {
        path: string;
        line?: number;
        basename?: string;
    };
    fileName?: string;
    startTime?: string; // [核心修改] time 重命名为 startTime
    endTime?: string;   // [核心修改] 新增 endTime
    duration?: number;
    period?: string;
    rating?: number;
    pintu?: string;
    // [新增] 新的核心字段
    folder?: string;
    periodCount?: number;
}

// [修改] 将新字段加入核心字段列表，包括theme字段
export const CORE_FIELDS = ['id', 'type', 'title', 'content', 'categoryKey', 'tags', 'theme', 'recurrence', 'icon', 'priority', 'date', 'header', 'startTime', 'endTime', 'duration', 'period', 'rating', 'pintu', 'folder', 'periodCount'] as const;

export type CoreField = typeof CORE_FIELDS[number];
export function getAllFields(items: Item[]): string[] {
    const set = new Set<string>(CORE_FIELDS as unknown as string[]);
    items.forEach(it => {
        Object.keys(it.extra || {}).forEach(k => set.add('extra.' + k));
        const f: any = (it as any).file;
        if (f && typeof f === 'object') Object.keys(f).forEach((k: string) => set.add('file.' + k));
    });
    return Array.from(set).sort();
}
export function readField(item: Item, field: string): any {
    if (field.startsWith('extra.')) return item.extra?.[field.slice(6)];
    if (field.startsWith('file.')) return (item as any).file?.[field.slice(5)];
    return (item as any)[field];
}
