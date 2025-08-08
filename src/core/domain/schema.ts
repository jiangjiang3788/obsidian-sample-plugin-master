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


  dateMs?: number;        // 毫秒时间戳（用于排序/区间比较）
  dateSource?: 'done'|'due'|'scheduled'|'start'|'created'|'end'|'block';

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

export interface DashboardConfig {
  name       : string;
  path?      : string;
  tags?      : string[];
  initialView?: string;
  initialDate?: string;
  modules    : ModuleConfig[];
}

export const CORE_FIELDS = [
  'id','title','content','type','status','category','tags','recurrence',
  'startISO','endISO','startMs','endMs','header','icon','priority',
  'createdDate','scheduledDate','startDate','dueDate','doneDate','cancelledDate',
  'created','modified','filename',
  // ✅ 统一日期口径字段，供 Excel / Table 显示与排序
  'date','dateMs','dateSource',
] as const;


export function getAllFields(items: Item[]): string[] {
  const set = new Set<string>(CORE_FIELDS as unknown as string[]);
  items.forEach(it => Object.keys(it.extra || {}).forEach(k => set.add('extra.' + k)));
  return Array.from(set);
}
export function readField(item: Item, field: string): any {
  return field.startsWith('extra.') ? item.extra?.[field.slice(6)] : (item as any)[field];
}