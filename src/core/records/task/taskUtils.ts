import type { RecordViewItem } from '@/core/records/RecordEntity';
import { isTaskCompleted, isTaskRecord } from './taskStatus';

/** Canonical Task completion predicate. Category labels are never status truth. */
export function isItemDone(item: RecordViewItem): boolean {
  return isTaskRecord(item) && isTaskCompleted(item);
}
