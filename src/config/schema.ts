import type { ViewName } from '../views';

// config/schema.ts - 定义数据模型和配置的 TypeScript 接口
export interface Item {
  id: string;            // 唯一标识: filePath#line
  title: string;         // 标题
  content: string;       // 全部内容（任务整行或块全文）
  type: 'task' | 'block';// 类型：任务 或 文本块
  status?: string;       // 状态：任务=open/done/cancelled，块=状态:: 值（若无则 undefined）
  category: string;      // 类别：分类::/类别:: 值或父文件夹名
  tags: string[];        // 标签列表：任务行内#tag，块主题:: 拆分
  recurrence: string;    // 重复规则：如 "every day when done"，否则 'none'
  date?: string;         // 日期：任务完成/取消日期 或 块 日期:: 值（格式 YYYY-MM-DD）
  created: number;       // 创建时间（文件级，Unix ms 时间戳）
  modified: number;      // 修改时间（文件级，Unix ms 时间戳）
  extra: Record<string, string|number|boolean>;  // 其他键值对，如 时间/时长/优先级/图标 等
  header?: string;           // 所在的 Markdown 标题文本
  icon?: string;             // 图标 emoji
  priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest';  // 优先级
  createdDate?: string;      // 创建日期 ➕
  scheduledDate?: string;    // 安排日期 ⏳
  startDate?: string;        // 开始日期 🛫
  dueDate?: string;          // 截止日期 📅
  doneDate?: string;         // 完成日期 ✅
  cancelledDate?: string;    // 取消日期 ❌
  filename?: string;         // 文件名
}

/** 仪表盘模块配置 */
export interface ModuleConfig {
  view: ViewName;
  title: string;
  collapsed?: boolean;
  filters?: FilterRule[];
  sort?: SortRule[];
  group?: string;
  props?: Record<string, any>;
  fields?: string[];
}

/** 过滤条件 */
export interface FilterRule {
  field: string;   // 可为 extra.xxx
  op: '=' | '!=' | 'includes' | 'regex' | '>' | '<';
  value: any;
}

/** 排序条件 */
export interface SortRule {
  field: string;   // 可为 extra.xxx
  dir: 'asc' | 'desc';
}

/** 仪表盘配置 */
export interface DashboardConfig {
  name: string;
  path?: string;
  tags?: string[];
  initialView?: string;
  initialDate?: string;
  modules: ModuleConfig[];
}

/* ================================
 *  字段统一维护 & 工具函数
 * ================================ */

/** 一处维护的核心字段清单（非 extra.*） */
export const CORE_FIELDS = [
  'id','title','content','type','status','category','tags','recurrence',
  'date','header','icon','priority','createdDate','scheduledDate','startDate',
  'dueDate','doneDate','cancelledDate','created','modified','filename'
] as const;

export type CoreField = typeof CORE_FIELDS[number];

/** 从 items 生成 “核心字段 + extra.xxx” 的完整字段列表 */
export function getAllFields(items: Item[]): string[] {
  const set = new Set<string>(CORE_FIELDS as unknown as string[]);
  for (const it of items) {
    Object.keys(it.extra || {}).forEach(k => set.add('extra.' + k));
  }
  return Array.from(set);
}

/** 通用读取字段值（支持 extra.xxx） */
export function readField(item: Item, field: string): any {
  if (field.startsWith('extra.')) {
    const key = field.substring(6);
    return item.extra?.[key];
  }
  // @ts-ignore
  return item[field as keyof Item];
}
