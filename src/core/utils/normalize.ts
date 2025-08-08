// src/core/utils/normalize.ts
import { Item } from '@core/domain/schema';

const ORDER = ['done','due','scheduled','start','created','end'] as const;
type DateKey = typeof ORDER[number];

/** 给每条 item 统一计算出 date/dateMs/dateSource */
export function normalizeItemDates(it: Item): void {
  // Block：原本就有 date
  if (it.type === 'block') {
    if (it.date) {
      it.dateSource = 'block';
      const t = Date.parse(it.date);
      if (!isNaN(t)) it.dateMs = t;
    }
    return;
  }

  // Task：按优先级推导
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
      return;
    }
  }
  // 没有任何日期字段：保持 undefined，不强行写
}