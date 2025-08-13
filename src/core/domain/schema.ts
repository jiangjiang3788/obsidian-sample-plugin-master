// src/core/domain/schema.ts
import type { RecurrenceInfo } from '@core/utils/mark';

// ----- 视图与布局定义 ----- //

/** 所有可选视图名称的权威定义 */
export const VIEW_OPTIONS = ['BlockView', 'TableView', 'ExcelView', 'TimelineView'] as const;
/** 由 VIEW_OPTIONS 推导出的视图名称联合类型 */
export type ViewName = typeof VIEW_OPTIONS[number];

/** [NEW] 数据源：一个可复用的、命名的查询，只负责定义“什么数据” */
export interface DataSource {
  id: string;          // 唯一ID, e.g., "ds_abcd1234"
  name: string;        // 用户可读的名称, e.g., "今天到期的任务"
  filters: FilterRule[];
  sort: SortRule[];
}

/** [NEW] 视图实例：一个具体的、配置好的展示组件，只负责定义“怎么看” */
export interface ViewInstance {
  id: string;          // 唯一ID
  title: string;       // 视图的标题, e.g., "我的任务日历"
  viewType: ViewName;  // 'TableView', 'BlockView', etc.
  dataSourceId: string;// 引用一个 DataSource 的 ID
  collapsed?: boolean; // 视图默认是否折叠

  // 通用的视图展示配置
  fields?: string[];   // 显示哪些字段 (用于 BlockView, ExcelView)
  group?: string;      // 分组字段 (用于 BlockView)

  // 视图专属配置 (由各自的视图编辑器定义和填充)
  viewConfig?: Record<string, any>; // e.g., { rowField: '...', colField: '...' } for TableView
  
  // 未来操作的占位符
  actions?: ActionConfig[];
}

/** [NEW] 布局：轻量级的视图容器，是用户在 Markdown 中直接使用的单位 */
export interface Layout {
  id: string;
  name: string; // "工作台", "复盘页"
  viewInstanceIds: string[]; // 只包含一组视图实例的ID

  // 布局自身的工具栏配置
  hideToolbar?: boolean;
  initialView?: string; // '年', '季', '月', '周', '天'
  initialDate?: string; // ISO Date string 'YYYY-MM-DD'

  // 布局显示模式
  displayMode?: 'list' | 'grid';
  gridConfig?: {
    columns?: number; // 网格布局的列数
  };
}

/** [NEW] 操作配置：为“从视图添加信息”等未来功能设计的模型 */
export interface ActionConfig {
  id: string;
  label: string; // 按钮上显示的文字, e.g., "新增任务"
  type: 'create_item'; // 操作类型
  targetFile: string; // 写入哪个文件, 支持模板, e.g., "tasks/{{date:YYYY-MM}}.md"
  template: string; // 写入内容的模板
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
}

// ----- 字段读取工具 (保持不变) ----- //
export const CORE_FIELDS = [ 'id', 'type', 'title', 'content', 'categoryKey', 'tags', 'icon', 'priority', 'date', 'dateMs', 'dateSource', 'startISO', 'endISO', 'startMs', 'endMs', 'filename', 'header', 'created', 'modified', 'file.path', 'file.line', 'file.basename', 'createdDate', 'scheduledDate', 'startDate', 'dueDate', 'doneDate', 'cancelledDate' ] as const;
export type CoreField = typeof CORE_FIELDS[number];
export function getAllFields(items: Item[]): string[] {
  const set = new Set<string>(CORE_FIELDS as unknown as string[]);
  items.forEach(it => {
    Object.keys(it.extra || {}).forEach(k => set.add('extra.' + k));
    const f: any = (it as any).file;
    if (f && typeof f === 'object') Object.keys(f).forEach((k: string) => set.add('file.' + k));
  });
  return Array.from(set);
}
export function readField(item: Item, field: string): any {
  if (field.startsWith('extra.')) return item.extra?.[field.slice(6)];
  if (field.startsWith('file.')) return (item as any).file?.[field.slice(5)];
  return (item as any)[field];
}