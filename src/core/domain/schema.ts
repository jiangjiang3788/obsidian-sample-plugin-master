// src/core/domain/schema.ts
import type { RecurrenceInfo } from '@core/utils/mark';

// ----- [新] 输入模板设置 (Input Template Settings) ----- //

/**
 * 定义一个选项的多个输出值，实现“一对多”映射
 * e.g., { content: '- [ ]', name: '📅' }
 */
export interface TemplateFieldOptionValues {
  [key: string]: string;
}

/**
 * 定义一个字段的单个选项 (e.g., "待办")
 */
export interface TemplateFieldOption {
  label: string; // UI上显示的选项, e.g., "📅 待办"
  values: TemplateFieldOptionValues;
}

/**
 * 定义一个模板中的字段 (e.g., "任务状态")
 */
export interface TemplateField {
  id: string; // 使用UUID或时间戳确保在React中key的唯一性
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'time' | 'select' | 'radio';
  defaultValue?: string;
  options?: TemplateFieldOption[];
}

/**
 * 定义一个完整的录入模板 (e.g., "默认任务" or "每周复盘")
 */
export interface InputTemplate {
  id: string;
  // [修改] name不再是简单的模板名，而是唯一标识符，如 "theme:生活/娱乐#type:Task"
  name: string; 
  fields: TemplateField[];
  outputTemplate: string;
  targetFile: string;
  appendUnderHeader?: string;
  // 用于打卡等特殊配置
  customConfig?: Record<string, any>;
  // [新增] 明确的禁用状态
  disabled?: boolean; 
}

/**
 * 插件设置中 inputSettings 的全新结构
 */
export interface InputSettings {
  // 用户可自定义的Block类型，驱动表格的列
  blockTypes: string[];
  // 所有主题路径的列表，驱动表格的行
  themePaths: string[]; 
  // 所有模板的集合，是我们所有配置的真理之源
  templates: InputTemplate[];
}


// ----- 视图与布局定义 ----- //

export const VIEW_OPTIONS = ['BlockView', 'TableView', 'ExcelView', 'TimelineView'] as const;
export type ViewName = typeof VIEW_OPTIONS[number];

export interface DataSource {
  id: string;
  name: string;
  filters: FilterRule[];
  sort: SortRule[];
}

export type DateConfigMode = 'inherit_from_layout' | 'fixed_period';
export type Period = '年' | '季' | '月' | '周' | '天';

export interface DateConfig {
  mode: DateConfigMode;
  period?: Period;
}

export interface ViewInstance {
  id: string;
  title: string;
  viewType: ViewName;
  dataSourceId: string;
  collapsed?: boolean;
  dateConfig?: DateConfig;
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


// ----- 规则定义 ----- //
export interface FilterRule {
  field: string;
  op: '=' | '!=' | 'includes' | 'regex' | '>' | '<';
  value: any;
}
export interface SortRule {
  field: string;
  dir: 'asc' | 'desc';
}


// ----- 数据项 Item ----- //
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
}

// ----- 字段读取工具 ----- //
// [FIXED] 在这个核心字段列表中添加 'recurrence'
export const CORE_FIELDS = [ 'id', 'type', 'title', 'content', 'categoryKey', 'tags', 'recurrence', 'icon', 'priority', 'date',   'filename', 'header', 'created', 'modified',   'file.basename'] as const;

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