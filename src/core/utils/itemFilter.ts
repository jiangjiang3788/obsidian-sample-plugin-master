// src/core/utils/itemFilter.ts
//-----------------------------------------------------------
// 统一的筛选 / 排序 / 日期区间 / 关键字过滤助手
// —— 用统一口径 item.date / item.dateMs 做时间过滤
//-----------------------------------------------------------

import { Item, FilterRule, SortRule, readField } from '@core/domain/schema';

/* ---------- 过滤 ---------- */
export function filterByRules(items: Item[], rules: FilterRule[] = []) {
  return rules.length ? items.filter(it => rules.every(r => matchRule(it, r))) : items;
}

function matchRule(item: Item, rule: FilterRule): boolean {
  const v1 = readField(item, rule.field);
  const v2 = rule.value;

  switch (rule.op) {
    case '='   : return String(v1) === String(v2);
    case '!='  : return String(v1) !== String(v2);
    case 'includes': return Array.isArray(v1)
        ? v1.some(x => String(x).includes(String(v2)))
        : String(v1).includes(String(v2));
    case 'regex':
      try { return new RegExp(String(v2)).test(String(v1)); }
      catch { return false; }
    case '>'   : return String(v1) > String(v2);
    case '<'   : return String(v1) < String(v2);
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
      if (av == null && bv == null) continue;
      if (av == null) return r.dir === 'asc' ? 1 : -1;
      if (bv == null) return r.dir === 'asc' ? -1 : 1;
      const cmp = String(av).localeCompare(String(bv), 'zh');
      if (cmp !== 0) return r.dir === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}

/* ---------- 日期区间（仅保留有统一 date 的项） ---------- */
// 仅替换这个函数即可
export function filterByDateRange(items: Item[], startISO?: string, endISO?: string) {
  if (!startISO && !endISO) return items;
  const sMs = startISO ? Date.parse(startISO) : null;
  const eMs = endISO   ? Date.parse(endISO)   : null;

  return items.filter(it => {
    // 统一口径优先：dateMs -> date(ISO)
    const t = (it.dateMs ?? (it.date ? Date.parse(it.date) : NaN));

    // ✅ 关键规则：
    // - 没有统一日期的项：
    //   * 若是已完成或已取消 → 隐藏
    //   * 其余（未完成）     → 保留
    if (isNaN(t)) {
      const st = String(it.status || '').toLowerCase();
      return !(st === 'done' || st === 'cancelled');
    }

    // 有日期的按区间过滤
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