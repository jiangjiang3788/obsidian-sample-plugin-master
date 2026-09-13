// src/core/utils/normalize.ts
// 统一 date/dateMs/dateSource。

import { RecordViewItem } from '@/core/records/RecordEntity';
import { getTaskDateFact } from '@/core/records/task/taskDate';

/** 统一计算出 date/dateMs/dateSource。 */
export function normalizeItemDates(it: RecordViewItem): void {
  // Non-Task records keep their own primary date semantics.
  if (it.recordType !== 'task') {
    if (it.date) {
      it.dateSource = 'block';
      const t = Date.parse(it.date);
      if (!isNaN(t)) it.dateMs = t;
    }
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

}