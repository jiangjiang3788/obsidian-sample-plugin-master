// config/schema.ts ─ 数据模型 & 配置接口
import type { ViewName } from '../views';

/* ---------- 数据项 ---------- */
export interface Item {
  id: string;
  title: string;
  content: string;
  type: 'task' | 'block';
  status?: string;
  category: string;
  tags: string[];
  recurrence: string;
  date?: string;
  created: number;
  modified: number;
  extra: Record<string, string | number | boolean>;
  header?: string;
  icon?: string;
  priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest';
  createdDate?: string;
  scheduledDate?: string;
  startDate?: string;
  dueDate?: string;
  doneDate?: string;
  cancelledDate?: string;
  filename?: string;
}

/* ---------- 仪表盘模块配置 ---------- */
export interface ModuleConfig {
  /* 基本 */
  view: ViewName;
  title: string;
  collapsed?: boolean;

  /* 数据过滤 / 排序 */
  filters?: FilterRule[];
  sort?: SortRule[];

  /* 分组（Block / List / Excel 等通用）*/
  group?: string;

  /* TableView 专用 */
  rowField?: string;
  colField?: string;

  /* 其他 */
  props?: Record<string, any>;
  fields?: string[];
}

/* Filter / Sort */
export interface FilterRule {
  field: string;
  op: '=' | '!=' | 'includes' | 'regex' | '>' | '<';
  value: any;
}
export interface SortRule {
  field: string;
  dir: 'asc' | 'desc';
}

/* ---------- 仪表盘 ---------- */
export interface DashboardConfig {
  name: string;
  path?: string;
  tags?: string[];
  initialView?: string;
  initialDate?: string;
  modules: ModuleConfig[];
}

/* ---------- 核心字段 ---------- */
export const CORE_FIELDS = [
  'id','title','content','type','status','category','tags','recurrence',
  'date','header','icon','priority','createdDate','scheduledDate','startDate',
  'dueDate','doneDate','cancelledDate','created','modified','filename',
] as const;
export type CoreField = typeof CORE_FIELDS[number];

/* ---------- 工具 ---------- */
export function getAllFields(items: Item[]): string[] {
  const set = new Set<string>(CORE_FIELDS as unknown as string[]);
  for (const it of items) Object.keys(it.extra || {}).forEach(k => set.add('extra.' + k));
  return Array.from(set);
}
export function readField(item: Item, field: string): any {
  if (field.startsWith('extra.')) return item.extra?.[field.slice(6)];
  return (item as any)[field];
}