import type { ViewName } from '@features/dashboard/ui';

/* ---------- 数据项 ---------- */
export interface Item {
  id      : string;
  title   : string;
  content : string;
  type    : 'task' | 'block';
  status? : string;
  category: string;
  tags    : string[];
  recurrence : string;

  /* timeline unified */
  startISO?: string;  endISO?: string;
  startMs? : number;  endMs? : number;

  created : number;
  modified: number;
  extra   : Record<string,string|number|boolean>;

  header?   : string;
  icon?     : string;
  priority? : 'lowest'|'low'|'medium'|'high'|'highest';

  /* legacy / compatibility */
  date?          : string;
  createdDate?   : string;
  scheduledDate? : string;
  startDate?     : string;
  dueDate?       : string;
  doneDate?      : string;
  cancelledDate? : string;
  filename?      : string;

  /* ✅ 统一口径（DataStore 标准化产物） */
  dateMs?: number;
  dateSource?: 'done'|'due'|'scheduled'|'start'|'created'|'end'|'block';
}

/* ---------- 仪表盘模块配置 ---------- */
export interface ModuleConfig {
  view     : ViewName;
  title    : string;
  collapsed?: boolean;
  filters? : FilterRule[];
  sort?    : SortRule[];
  group?   : string;
  rowField?: string;
  colField?: string;
  props?   : Record<string,any>;
  fields?  : string[];
}

export interface FilterRule {
  field: string;
  op   : '=' | '!=' | 'includes' | 'regex' | '>' | '<';
  value: any;
}
export interface SortRule {
  field: string;
  dir  : 'asc' | 'desc';
}

/* ---------- ✅ 每个仪表盘的写入 overrides ---------- */
export interface DashboardOverrides {
  /** 任务写入覆盖：模板 + 文件路径（可使用 {{主题}}） */
  task?: {
    template?: string;
    file?: string;
  };
  /** 各 Block 写入覆盖（计划/总结/思考/打卡） */
  blocks?: Record<string, {
    file?: string;
    /** 输出字段顺序（如：['分类','日期','主题','图标','标签','内容']） */
    fieldsOrder?: string[];
    /** 预留：如需后续自定义模板可扩展 template?: string; */
  }>;
}

/* ---------- 仪表盘配置 ---------- */
export interface DashboardConfig {
  name       : string;
  path?      : string;
  tags?      : string[];
  initialView?: string;
  initialDate?: string;
  modules    : ModuleConfig[];

  /** ✅ 新增：本仪表盘专属写入覆盖 */
  overrides?: DashboardOverrides;
}

export const CORE_FIELDS = [
  'id','title','content','type','status','category','tags','recurrence',
  'startISO','endISO','startMs','endMs','header','icon','priority',
  'createdDate','scheduledDate','startDate','dueDate','doneDate','cancelledDate',
  'created','modified','filename',
  // 统一日期口径字段（供 Excel/Table 显示/排序）
  'date','dateMs','dateSource',
] as const;
export type CoreField = typeof CORE_FIELDS[number];

export function getAllFields(items: Item[]): string[] {
  const set = new Set<string>(CORE_FIELDS as unknown as string[]);
  items.forEach(it => Object.keys(it.extra || {}).forEach(k => set.add('extra.' + k)));
  return Array.from(set);
}
export function readField(item: Item, field: string): any {
  return field.startsWith('extra.') ? item.extra?.[field.slice(6)] : (item as any)[field];
}
