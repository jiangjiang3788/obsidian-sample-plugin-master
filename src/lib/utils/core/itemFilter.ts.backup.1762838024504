// src/core/utils/itemFilter.ts
// 统一的筛选 / 排序 / 日期区间 / 关键字过滤助手
// —— 删除 status/category 依赖，改用 categoryKey 推断是否“已关闭”
// —— 修正数字/日期的比较与排序（避免把数值/日期按字符串字典序比较）
import { Item, FilterRule, SortRule, readField } from '../../types/domain/schema';

/* ---------- 通用比较：数字/日期优先，其次回退字符串 ---------- */
function coerceForCompare(v: any): number | string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;

  const s = String(v).trim();

  // 优先识别 ISO 日期（YYYY-MM-DD 开头；含时间也可）
  const isDateLike = /^\d{4}-\d{1,2}-\d{1,2}/.test(s) || /^\d{4}\/\d{1,2}\/\d{1,2}/.test(s);
  if (isDateLike) {
    const ts = Date.parse(s.replace(/\//g, '-'));
    if (!Number.isNaN(ts)) return ts;
  }

  // 识别纯数字（含小数/科学计数）
  const n = Number(s);
  if (!Number.isNaN(n) && /\d/.test(s) && !/[^\d.\-+eE]/.test(s)) return n;

  return s;
}

function cmpMixed(a: any, b: any): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;   // 让空值在后（升序）
  if (b == null) return -1;

  const A = coerceForCompare(a);
  const B = coerceForCompare(b);

  if (typeof A === 'number' && typeof B === 'number') return A - B;
  // 回退字符串语义（保持原值进行本地化比较）
  return String(a).localeCompare(String(b), 'zh');
}

/* ---------- 过滤 ---------- */
export function filterByRules(items: Item[], rules: FilterRule[] = []) {
  if (!rules.length) return items;
  
  return items.filter(item => {
    // 如果没有规则，返回所有项目
    if (rules.length === 0) return true;
    
    // 如果只有一个规则，直接匹配
    if (rules.length === 1) return matchRule(item, rules[0]);
    
    // 处理多个规则的逻辑关系
    let result = matchRule(item, rules[0]);
    
    for (let i = 1; i < rules.length; i++) {
      const currentRule = rules[i];
      const previousRule = rules[i - 1];
      const logic = previousRule.logic || 'and';
      
      if (logic === 'and') {
        result = result && matchRule(item, currentRule);
      } else if (logic === 'or') {
        result = result || matchRule(item, currentRule);
      }
    }
    
    return result;
  });
}

function matchRule(item: Item, rule: FilterRule): boolean {
  let v1: any = readField(item, rule.field);
  let v2: any = rule.value;

  // 优先使用预处理字段进行大小写无关的比较
  if (rule.field === 'title') {
    v1 = (item as any).titleLower ?? String(v1 ?? '').toLowerCase();
    v2 = String(v2 ?? '').toLowerCase();
  } else if (rule.field === 'content') {
    v1 = (item as any).contentLower ?? String(v1 ?? '').toLowerCase();
    v2 = String(v2 ?? '').toLowerCase();
  } else if (rule.field === 'theme') {
    const themeNorm = (item as any).themePathNormalized ?? (item as any).theme ?? v1;
    v1 = String(themeNorm ?? '').toLowerCase();
    v2 = String(v2 ?? '').toLowerCase();
  } else if (rule.field === 'tags') {
    const tagsLower: string[] = (item as any).tagsLower
      ?? (Array.isArray(v1) ? v1.map(x => String(x).toLowerCase()) : []);
    const needle = String(v2 ?? '').toLowerCase();
    if (rule.op === 'includes' || rule.op === '=') {
      return tagsLower.includes(needle);
    }
    if (rule.op === '!=') {
      return !tagsLower.includes(needle);
    }
    // 其他操作回退为字符串比较
    v1 = tagsLower.join(',');
    v2 = needle;
  }

  switch (rule.op) {
    case '='   : return cmpMixed(v1, v2) === 0;
    case '!='  : return cmpMixed(v1, v2) !== 0;
    case 'includes': return Array.isArray(v1)
        ? v1.some(x => String(x).includes(String(v2)))
        : String(v1).includes(String(v2));
    case 'regex':
      try { return new RegExp(String(v2)).test(String(v1)); }
      catch { return false; }
    case '>'   : return cmpMixed(v1, v2) > 0;
    case '<'   : return cmpMixed(v1, v2) < 0;
    default    : return false;
  }
}

/* ---------- 排序 ---------- */
export function sortItems(items: Item[], rules: SortRule[] = []) {
  if (!rules.length) return items;

  return [...items].sort((a, b) => {
    for (const r of rules) {
      const av = readField(a, r.field);
      const bv = readField(b, r.field);

      // 统一将空值放到最后（升序），放到最前（降序）
      if (av == null && bv == null) continue;
      if (av == null) return r.dir === 'asc' ? 1 : -1;
      if (bv == null) return r.dir === 'asc' ? -1 : 1;

      const cmp = cmpMixed(av, bv);
      if (cmp !== 0) return r.dir === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}

/* ---------- 日期区间（仅保留有统一 date 的项） ---------- */
function isClosed(it: Item) {
  const k = (it.categoryKey || '').toLowerCase();
  return /\/(done|cancelled)\b/.test(k);
}

export function filterByDateRange(items: Item[], startISO?: string, endISO?: string) {
  if (!startISO && !endISO) return items;
  const sMs = startISO ? Date.parse(startISO) : null;
  const eMs = endISO   ? Date.parse(endISO)   : null;

  return items.filter(it => {
    const t = (it.dateMs ?? (it.date ? Date.parse((it.date || '').replace(/\//g, '-')) : NaN));

    // 没统一日期：已关闭→隐藏；未关闭→保留
    if (isNaN(t)) {
      return !isClosed(it);
    }
    if (sMs !== null && t < sMs) return false;
    if (eMs !== null && t > eMs) return false;
    return true;
  });
}

/* ---------- 关键字 ---------- */
export function filterByKeyword(items: Item[], kw: string) {
  if (!kw.trim()) return items;
  const s = kw.trim().toLowerCase();
  return items.filter(it => {
    const titleLower = (it as any).titleLower ?? (it.title || '').toLowerCase();
    const contentLower = (it as any).contentLower ?? (it.content || '').toLowerCase();
    return (titleLower + ' ' + contentLower).includes(s);
  });
}

/* ---------- [新增] 周期字段过滤器 ---------- */
/**
 * 根据周期字段筛选项目。
 * @param items - 要筛选的项目数组。
 * @param period - 目标周期，例如 '年', '季', '月', '周', '天'。
 * @returns 筛选后的项目数组。一个项目如果满足以下任一条件，则会被保留：
 * 1. 它没有 `period` 字段。
 * 2. 它的 `period` 字段值与传入的 `period` 参数匹配。
 */
export function filterByPeriod(items: Item[], period: string): Item[] {
    if (!period) {
        return items;
    }
    return items.filter(item => {
        const itemPeriod = readField(item, 'period');
        // 如果项目没有周期属性，或者其周期与当前视图周期匹配，则保留
        return itemPeriod == null || itemPeriod === '' || itemPeriod === period;
    });
}
