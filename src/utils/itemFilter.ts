// src/utils/itemFilter.ts
//-----------------------------------------------------------
// 统一的筛选 / 排序 / 日期区间 / 关键字过滤助手
//-----------------------------------------------------------

import { Item, FilterRule, SortRule, readField } from '../config/schema';

/* ---------- 过滤 ---------- */
export function filterByRules(items: Item[], rules: FilterRule[] = []) {
  return rules.length
    ? items.filter(it => rules.every(r => matchRule(it, r)))
    : items;
}

function matchRule(item: Item, rule: FilterRule): boolean {
  const v1 = readField(item, rule.field);
  const v2 = rule.value;

  switch (rule.op) {
    case '=':   return String(v1) === String(v2);
    case '!=':  return String(v1) !== String(v2);
    case 'includes':
      return Array.isArray(v1)
        ? v1.some(x => String(x).includes(String(v2)))
        : String(v1).includes(String(v2));
    case 'regex':
      try { return new RegExp(String(v2)).test(String(v1)); }
      catch { return false; }
    case '>':   return String(v1) >  String(v2);
    case '<':   return String(v1) <  String(v2);
    default:    return false;
  }
}

/* ---------- 排序 ---------- */
export function sortItems(items: Item[], rules: SortRule[] = []) {
  if (!rules.length) return items;

  return [...items].sort((a, b) => {
    for (const r of rules) {
      const av = readField(a, r.field);
      const bv = readField(b, r.field);
      if (av == null && bv == null) continue;
      if (av == null) return r.dir === 'asc' ? 1 : -1;
      if (bv == null) return r.dir === 'asc' ? -1 : 1;
      const cmp = String(av).localeCompare(String(bv), 'zh');
      if (cmp !== 0) return r.dir === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}

/* ---------- 日期区间 ---------- */
export function filterByDateRange(
  items: Item[],
  startISO?: string,
  endISO?: string,
  momentLib: any = (window as any).moment
) {
  if (!startISO && !endISO) return items;
  const s = startISO ? momentLib(startISO) : null;
  const e = endISO   ? momentLib(endISO)   : null;

  return items.filter(it => {
    if (!it.date) return true;
    const d = momentLib(it.date, 'YYYY-MM-DD');
    if (s && d.isBefore(s, 'day')) return false;
    if (e && d.isAfter(e,  'day')) return false;
    return true;
  });
}

/* ---------- 关键字 ---------- */
export function filterByKeyword(items: Item[], kw: string) {
  if (!kw.trim()) return items;
  const s = kw.trim().toLowerCase();
  return items.filter(it =>
    (it.title + ' ' + it.content).toLowerCase().includes(s)
  );
}