// src/core/utils/normalize.ts
// 统一 date/dateMs/dateSource（categoryKey 已由 parser 决定；此处只兜底）

import { Item } from '@core/domain/schema';

const ORDER = ['done','due','scheduled','start','created','end'] as const;
type DateKey = typeof ORDER[number];

/** 统一计算出 date/dateMs/dateSource；并兜底 categoryKey */
export function normalizeItemDates(it: Item): void {
  // Block：原本就有 date
  if (it.type === 'block') {
    if (it.date) {
      it.dateSource = 'block';
      const t = Date.parse(it.date);
      if (!isNaN(t)) it.dateMs = t;
    }
    // 兜底：没有就用空字符串（理论上 parser 会给到）
    if (!it.categoryKey) (it as any).categoryKey = '';
    return;
  }

  // Task：按优先级推导统一日期
  const pick: Record<DateKey, string | undefined> = {
    done     : it.doneDate,
    due      : it.dueDate,
    scheduled: it.scheduledDate,
    start    : it.startDate ?? it.startISO,
    created  : it.createdDate,
    end      : it.endISO,
  };

  for (const k of ORDER) {
    const iso = pick[k];
    if (iso) {
      it.date = iso;
      it.dateSource = k;
      const t = Date.parse(iso);
      if (!isNaN(t)) it.dateMs = t;
      break;
    }
  }

  // 兜底 categoryKey：任务默认 open
  if (!it.categoryKey) (it as any).categoryKey = '任务/open';
}