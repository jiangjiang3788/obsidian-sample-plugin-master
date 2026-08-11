import type { Item } from '@/core/types/schema';
import { isTaskCompleted, isTaskRecord } from './taskStatus';

/** Canonical Task completion predicate. Category labels are never status truth. */
export function isItemDone(item: Item): boolean {
  return isTaskRecord(item) && isTaskCompleted(item);
}
