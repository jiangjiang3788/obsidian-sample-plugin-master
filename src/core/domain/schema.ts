// src/core/domain/schema.ts
import type { RecurrenceInfo } from '@core/utils/mark';

// ----- [最终版] 输入模板设置 (Input Template Settings) ----- //

export interface TemplateFieldOption {
  value: string;
  label?: string;
  extraValues?: Record<string, string>;
}

export interface TemplateField {
  id: string; 
  key: string;
  type: 'text' | 'textarea' | 'date' | 'time' | 'select' | 'radio' | 'number';
  defaultValue?: string;
  options?: TemplateFieldOption[];
  min?: number;
  max?: number;
}

export interface InputTemplate {
  id: string;
  name: string; 
  fields: TemplateField[];
  outputTemplate: string;
  targetFile: string;
  appendUnderHeader?: string;
  customConfig?: Record<string, any>;
  disabled?: boolean; 
}

export interface InputSettings {
  blockTypes: string[];
  themePaths: string[]; 
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
export const CORE_FIELDS = [ 'id', 'type', 'title', 'content', 'categoryKey', 'tags', 'recurrence', 'icon', 'priority', 'date', 'filename', 'header', 'created', 'modified', 'file.basename'] as const;

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