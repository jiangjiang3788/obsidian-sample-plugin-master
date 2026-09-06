// src/core/utils/normalize.ts
// 统一 date/dateMs/dateSource（categoryKey 已由 parser 决定；此处只兜底）

import { RecordViewItem } from '@/core/records/RecordEntity';
import { getTaskDateFact } from '@/core/records/task/taskDate';

/** 统一计算出 date/dateMs/dateSource；并兜底 categoryKey */
export function normalizeItemDates(it: RecordViewItem): void {
  // Non-Task records keep their own primary date semantics.
  if (it.coreBlock !== 'task') {
    if (it.date) {
      it.dateSource = 'block';
      const t = Date.parse(it.date);
      if (!isNaN(t)) it.dateMs = t;
    }
    // 兜底：没有就用空字符串（理论上 parser 会给到）
    if (!it.categoryKey) (it as any).categoryKey = '';
    return;
  }

  // Task generic views receive one stable primary date for backward compatibility.
  // Planned/due/completed views must query their explicit fact instead of relying on
  // this projection. Completion therefore does not move an existing Task to a new day.
  const fact = getTaskDateFact(it, 'default');
  if (fact.value) {
    it.date = fact.value;
    it.dateSource = fact.source;
    const t = Date.parse(fact.value);
    if (!isNaN(t)) it.dateMs = t;
  }

  // categoryKey is display metadata only; Task status is never encoded here.
  if (!it.categoryKey) (it as any).categoryKey = '任务';
}