// src/core/domain/schema.ts
import type { RecurrenceInfo } from '@core/utils/mark';

// ----- [重构后] 快速输入设置 (Input Settings) ----- //

/**
 * 定义一个模板中的单个字段
 */
export interface TemplateFieldOption {
    value: string;
    label?: string;
    extraValues?: Record<string, string>;
}

export interface TemplateField {
    id: string;
    key: string; // 用于模板中的变量名， e.g., {{my_field}}
    label: string; // UI上展示的标签
    type: 'text' | 'textarea' | 'date' | 'time' | 'select' | 'radio' | 'number';
    defaultValue?: string;
    options?: TemplateFieldOption[];
    min?: number;
    max?: number;
}

/**
 * Block 基础模板定义 (e.g., Task, 总结, 打卡)
 * 这是所有设置的“单一事实来源”
 */
export interface BlockTemplate {
    id: string;               // e.g., 'blk_task', 'blk_habit'
    name: string;             // e.g., 'Task', '打卡' (作为列标题和命令的一部分)
    fields: TemplateField[];
    outputTemplate: string;   // 输出到文件的模板
    targetFile: string;       // 目标文件路径模板
    appendUnderHeader?: string; // 可选的追加目标标题
}

/**
 * 主题的定义 (e.g., 个人/项目)
 * 作为行标题
 */
export interface ThemeDefinition {
    id: string;    // 唯一ID
    path: string;  // 主题路径, e.g., "个人/项目"
    icon?: string; // 主题图标 (可选)
}

/**
 * 主题对 Block 的覆写配置
 * 存储在 overrides 数组中，代表一个 (主题, Block) 的交叉点配置
 */
export interface ThemeOverride {
    id: string;               // 覆写配置自身的ID
    blockId: string;          // 关联的 Block ID, e.g., 'blk_task'
    themeId: string;          // 关联的 Theme ID
    status: 'enabled' | 'disabled'; // 'enabled' 代表覆写, 'disabled' 代表禁用
    // 以下字段存在时，代表对基础 BlockTemplate 的覆写
    fields?: TemplateField[];
    outputTemplate?: string;
    targetFile?: string;
    appendUnderHeader?: string;
}

/**
 * 最终的 InputSettings 结构
 */
export interface InputSettings {
    blocks: BlockTemplate[];
    themes: ThemeDefinition[];
    overrides: ThemeOverride[];
}


// ----- 视图与布局定义 (保持不变) ----- //

export const VIEW_OPTIONS = ['BlockView', 'TableView', 'ExcelView', 'TimelineView'] as const;
export type ViewName = typeof VIEW_OPTIONS[number];

export interface DataSource {
    id: string;
    name: string;
    filters: FilterRule[];
    sort: SortRule[];
}

export interface ViewInstance {
    id: string;
    title: string;
    viewType: ViewName;
    dataSourceId: string;
    collapsed?: boolean;
    fields?: string[];
    group?: string;
    viewConfig?: Record<string, any>;
    actions?: ActionConfig[];
}

export interface Layout {
    id: string;
    name: string;
    viewInstanceIds: string[];
    hideToolbar?: boolean;
    initialView?: string;
    initialDate?: string;
    initialDateFollowsNow?: boolean;
    displayMode?: 'list' | 'grid';
    gridConfig?: {
        columns?: number;
    };
}

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


// ----- 规则定义 (保持不变) ----- //
export interface FilterRule {
    field: string;
    op: '=' | '!=' | 'includes' | 'regex' | '>' | '<';
    value: any;
}
export interface SortRule {
    field: string;
    dir: 'asc' | 'desc';
}


// ----- 数据项 Item (保持不变) ----- //
export interface Item {
    id: string;
    title: string;
    content: string;
    type: 'task' | 'block';
    tags: string[];
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
    time?: string;
    duration?: number;
    period?: string;
    rating?: number;
}

// ----- 字段读取工具 (保持不变) ----- //
export const CORE_FIELDS = ['id', 'type', 'title', 'content', 'categoryKey', 'tags', 'recurrence', 'icon', 'priority', 'date', 'filename', 'header', 'created', 'modified', 'file.basename', 'time', 'duration', 'period', 'rating'] as const;

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