// src/core/utils/itemFilter.ts
// 统一的筛选 / 排序 / 日期区间 / 关键字过滤助手
// —— 删除 status/category 依赖，改用 categoryKey 推断是否“已关闭”
// —— 修正数字/日期的比较与排序（避免把数值/日期按字符串字典序比较）
import { Item, FilterRule, SortRule, readField } from '@core/domain/schema';

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
  return rules.length ? items.filter(it => rules.every(r => matchRule(it, r))) : items;
}

function matchRule(item: Item, rule: FilterRule): boolean {
  const v1 = readField(item, rule.field);
  const v2 = rule.value;

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
  return items.filter(it => (it.title + ' ' + it.content).toLowerCase().includes(s));
}
