// src/core/domain/schema.ts
import type { RecurrenceInfo } from '@core/utils/mark';

// [REFACTOR] Define ViewName and options at the domain level to break circular dependency.
/** 所有可选视图名称的权威定义 */
export const VIEW_OPTIONS = ['BlockView', 'TableView', 'ExcelView', 'TimelineView'] as const;
/** 由 VIEW_OPTIONS 推导出的视图名称联合类型 */
export type ViewName = typeof VIEW_OPTIONS[number];


/* ---------- 数据项 ---------- */
export interface Item {
  id: string;                      // path#line
  title: string;
  content: string;
  type: 'task' | 'block';
  tags: string[];

  /** 合并后的单一口径：任务=“任务/<status>”，块=原类别（计划/总结/思考/打卡/…） */
  categoryKey: string;

  /** 原始重复性串；运行时可配合 recurrenceInfo 使用 */
  recurrence: string;
  /** 运行时结构化的重复性（不落盘） */
  recurrenceInfo?: RecurrenceInfo;

  /* timeline（仅时间轴/甘特视图使用） */
  startISO?: string; endISO?: string;      // ISO 日期字符串
  startMs?: number; endMs?: number;      // UTC 毫秒（运行时计算）

  /** 统一口径（权威） */
  date?: string;                         // 统一显示/过滤日期
  dateMs?: number;                         // 统一排序值（运行时计算）
  dateSource?: 'done' | 'due' | 'scheduled' | 'start' | 'created' | 'end' | 'block';

  /** 文件元（运行时） */
  created: number;                       // file.stat.ctime
  modified: number;                      // file.stat.mtime
  filename?: string;                       // 兼容旧用法
  header?: string;

  /** 展示性元 */
  icon?: string;
  priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest';

  /** 扩展 */
  extra: Record<string, string | number | boolean>;

  /* ---------- 兼容字段（仅作解析线索；UI 不直接读取） ---------- */
  createdDate?: string;
  scheduledDate?: string;
  startDate?: string;
  dueDate?: string;
  doneDate?: string;
  cancelledDate?: string;

  /* 运行时便捷定位（不落盘） */
  file?: {
    path: string;
    line?: number;
    basename?: string;
  };
  // 【新增】添加 fileName 字段，方便 TimelineView 获取
  fileName?: string;
}

/* ---------- 仪表盘模块配置 ---------- */
export interface ModuleConfig {
  view: ViewName; // [REFACTOR] Now uses the locally defined ViewName type.
  title: string;
  collapsed?: boolean;
  filters?: FilterRule[];
  sort?: SortRule[];
  group?: string;
  rowField?: string;
  colField?: string;
  props?: Record<string, any>;
  fields?: string[];
  // 添加 viewConfig 用于存储视图专属配置，例如 TimelineView 的配置
  viewConfig?: Record<string, any>;
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

/* ---------- 仪表盘配置 ---------- */
export interface DashboardOverrides {
  task?: { template?: string; file?: string };
  blocks?: Record<string, { file?: string; fieldsOrder?: string[] }>;
}
export interface DashboardConfig {
  name: string;
  path?: string;
  tags?: string[];
  initialView?: string;
  initialDate?: string;
  modules: ModuleConfig[];
  overrides?: DashboardOverrides;
}

/* ---------- 字段集合 ---------- */
export const CORE_FIELDS = [
  // 基本
  'id', 'type', 'title', 'content', 'categoryKey', 'tags', 'icon', 'priority',

  // 统一日期口径（权威）
  'date', 'dateMs', 'dateSource',

  // 时间轴
  'startISO', 'endISO', 'startMs', 'endMs',

  // 文件元
  'filename', 'created', 'modified',
  'file.path', 'file.line', 'file.basename',

  // 兼容日期字段
  'createdDate', 'scheduledDate', 'startDate', 'dueDate', 'doneDate', 'cancelledDate',
] as const;
export type CoreField = typeof CORE_FIELDS[number];

/** 收集所有可能字段（含 extra.* 与 file.*） */
export function getAllFields(items: Item[]): string[] {
  const set = new Set<string>(CORE_FIELDS as unknown as string[]);
  items.forEach(it => {
    Object.keys(it.extra || {}).forEach(k => set.add('extra.' + k));
    const f: any = (it as any).file;
    if (f && typeof f === 'object') Object.keys(f).forEach((k: string) => set.add('file.' + k));
  });
  return Array.from(set);
}

/** 统一读取：支持 extra.* / file.* 前缀 */
export function readField(item: Item, field: string): any {
  if (field.startsWith('extra.')) return item.extra?.[field.slice(6)];
  if (field.startsWith('file.')) return (item as any).file?.[field.slice(5)];
  return (item as any)[field];
}