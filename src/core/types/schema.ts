// src/core/domain/schema.ts
import type { RecurrenceInfo } from '@core/utils/mark';
import { readExplicitThemeParts } from '@/core/theme/themeSemantics';
import type { AiSettings } from './ai-schema';
import type { FieldOriginMap } from './fieldOrigin';
import { DEFAULT_AI_SETTINGS } from './ai-schema';

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
    // [新增] AI 设置
    aiSettings?: AiSettings;
    // [新增] 开发模式：错误 toast 同时输出 console.error stack
    devConsoleStackEnabled?: boolean;
    // [新增] 全局分类颜色配置（categoryKey 基础类别 → 颜色）
    categoryColors?: Record<string, string>;
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
    // [新增] AI 默认设置
    aiSettings: DEFAULT_AI_SETTINGS,
    // [新增] 默认关闭（避免污染控制台）
    devConsoleStackEnabled: false,
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
    semanticType?: 'path' | 'ratingPair' | string;
    auxKey?: string;
    defaultValue?: string;
    options?: TemplateFieldOption[];
    min?: number;
    max?: number;
}
export interface BlockTemplate {
    id: string;
    name: string;
    categoryKey: string;
    fields: TemplateField[];
    outputTemplate: string;
    targetFile: string;
    appendUnderHeader?: string;
}
export interface ThemeDefinition {
    id: string;
    path: string;
    icon?: string;
    /** 同级主题排序值；未设置时按路径回退排序，兼容旧数据。 */
    order?: number;
    /** UI-only state; persisted as part of InputSettings for theme matrix. */
    status?: 'active' | 'inactive';
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
    categories?: string[];
}

// ----- 视图与布局定义 (保持不变) ----- //

// [MODIFIED] 添加 HeatmapView 和 EventTimelineView
export const VIEW_OPTIONS = ['BlockView', 'TableView', 'ExcelView', 'TimelineView', 'StatisticsView', 'HeatmapView', 'EventTimelineView', 'ProgressView', 'TaskExecutionView'] as const;
export type ViewName = typeof VIEW_OPTIONS[number];

// [修改] 实现 Groupable 接口，整合数据源功能
export interface ViewInstance extends Groupable {
    title: string;
    viewType: ViewName;
    dataSourceId?: string; // [废弃] 保留用于向后兼容，新视图不再使用
    collapsed?: boolean;
    fields?: string[];
    group?: string;
    groupFields?: string[]; // [新增] 多字段分组
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
    /** Layout 级全局筛选规则：由 toolbar 的数据筛选面板维护，作用于该布局下所有视图。 */
    globalFilters?: FilterRule[];
    selectedThemes?: string[]; // [兼容] 旧版主题筛选字段，后续由 globalFilters 替代
    selectedCategories?: string[]; // [兼容] 旧版分类筛选字段，后续由 globalFilters 替代
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
export type FilterOperator =
    | '='
    | '!='
    | 'includes'
    | 'regex'
    | '>'
    | '<'
    | 'in'
    | 'notIn'
    | 'between'
    | 'empty'
    | 'notEmpty';

export interface FilterRule {
    field: string;
    op: FilterOperator;
    value: any;
    logic?: 'and' | 'or'; // 逻辑关系：且/或
}
export interface SortRule {
    field: string;
    dir: 'asc' | 'desc';
}
export interface Item {
    id: string;
    templateId?: string;
    templateSourceType?: 'block' | 'override';
    title: string;
    content: string;
    /** 编辑态使用的正文真源：尽量保留用户原始表达，但去掉任务前缀/内联元数据噪音。 */
    editableText?: string;
    /** 原始源文本（单行 task 或完整 block 内容），用于后续快照/调试。 */
    rawSource?: string;
    type: 'task' | 'block';
    tags: string[];
    theme?: string;     // [新增] 主题字段，用于统一的主题管理
    /** 主题完整路径，供视图筛选/分组使用，例如：学习/英语/听力。 */
    themePath?: string;
    /** 主题根节点，供视图设置按大类分组，例如：学习。 */
    rootTheme?: string;
    /** 主题叶子节点，供视图设置按末级主题分组，例如：听力。 */
    leafTheme?: string;
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
    /**
     * Optional provenance metadata for parsed fields.
     * Used by field/debug UI to explain where a value came from.
     */
    fieldOrigins?: FieldOriginMap;
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
        folder?: string;
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
    // [新增] 多次打卡和等级系统字段
    displayCount?: number;     // 显示的打卡次数（可手动编辑）
    levelCount?: number;       // 计入等级的次数（可以 < displayCount）
    countForLevel?: boolean;   // 该次打卡是否计入等级（默认true）
    manuallyEdited?: boolean;  // 是否被手动编辑过
}

// ----- 字段分层入口 ----- //
// Core fields are intrinsic record data. They intentionally exclude file metadata,
// derived theme parts, and legacy aliases. UI field pickers should be built from
// DEFAULT_FIELD_OPTIONS via getAllFields(), not by assuming every Item property is
// a user-facing field.
export const CORE_FIELDS = [
    'id', 'type', 'title', 'content', 'categoryKey', 'tags',
    'recurrence', 'icon', 'priority', 'date', 'startTime', 'endTime', 'duration',
    'period', 'rating', 'pintu', 'folder', 'periodCount'
] as const;

export const SEMANTIC_FIELDS = [
    'baseCategory',
    // 主题筛选/分组的唯一默认字段：完整主题路径。
    // theme 是旧兼容字段，不再出现在默认字段选择器中。
    'themePath', 'rootTheme', 'leafTheme',
] as const;

export const FILE_FIELDS = [
    'file.path', 'file.basename', 'file.name', 'file.folder', 'header'
] as const;

export const LEGACY_FIELDS = [
    'theme', 'filename', 'fileName'
] as const;

export const DEFAULT_FIELD_OPTIONS = [
    ...CORE_FIELDS,
    ...SEMANTIC_FIELDS,
    ...FILE_FIELDS,
] as const;

export const LEGACY_EXTRA_ALIAS_KEYS = [
    '正文', '内容', '任务内容', '记录内容', 'editableText'
] as const;

const LEGACY_EXTRA_ALIAS_SET = new Set<string>(LEGACY_EXTRA_ALIAS_KEYS as unknown as string[]);

export type CoreField = typeof CORE_FIELDS[number];
export type SemanticField = typeof SEMANTIC_FIELDS[number];
export type FileField = typeof FILE_FIELDS[number];
export type LegacyField = typeof LEGACY_FIELDS[number];

function isVisibleExtraField(item: Item, key: string): boolean {
    if (!LEGACY_EXTRA_ALIAS_SET.has(key)) return true;
    // Historical parser versions polluted extra with body aliases. Hide those
    // unless they were explicitly read from markdown in this scan.
    const origins = item.fieldOrigins?.[`extra.${key}`] || [];
    return origins.some(origin => origin.confidence === 'explicit');
}

export function getAllFields(items: Item[]): string[] {
    const set = new Set<string>(DEFAULT_FIELD_OPTIONS as unknown as string[]);
    items.forEach(it => {
        Object.keys(it.extra || {}).forEach(k => {
            if (isVisibleExtraField(it, k)) set.add('extra.' + k);
        });
        const f: any = (it as any).file;
        if (f && typeof f === 'object') Object.keys(f).forEach((k: string) => set.add('file.' + k));
    });
    return Array.from(set).sort();
}
export function readField(item: Item, field: string): any {
    if (field.startsWith('extra.')) return item.extra?.[field.slice(6)];
    if (field.startsWith('file.')) {
        const key = field.slice(5);
        const file = (item as any).file || {};
        if (key === 'name' || key === 'basename') return file.basename ?? item.fileName ?? item.filename;
        if (key === 'folder') return file.folder ?? item.folder;
        return file[key];
    }
    if (field === 'baseCategory' || field === '分类根' || field === 'rootCategory') {
        const raw = String(item.categoryKey || '').trim();
        return raw.split('/').map(part => part.trim()).filter(Boolean)[0] || raw;
    }

    // 主题三分法给视图设置用：只从显式主题字段推导，禁止 header/heading 兜底。
    if (field === 'themePath' || field === '完整主题' || field === '主题路径') {
        return readExplicitThemeParts(item as any).themePath ?? undefined;
    }
    if (field === 'rootTheme' || field === '根主题' || field === 'themeRoot') {
        return readExplicitThemeParts(item as any).rootTheme ?? undefined;
    }
    if (field === 'leafTheme' || field === '叶主题' || field === 'themeLeaf') {
        return readExplicitThemeParts(item as any).leafTheme ?? undefined;
    }

    return (item as any)[field];
}
