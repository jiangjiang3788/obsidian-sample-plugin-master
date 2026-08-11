import type { Item } from '@core/types/public';
import { getTaskRecurrenceInfo } from './taskRecurrence';

export type TaskCadenceKey = 'routine' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export const TASK_CADENCE_ORDER: TaskCadenceKey[] = ['routine', 'day', 'week', 'month', 'quarter', 'year'];

export const TASK_CADENCE_META: Record<TaskCadenceKey, { label: string; emoji: string }> = {
  routine: { label: '日常任务', emoji: '🌿' },
  day: { label: '天任务', emoji: '☀️' },
  week: { label: '周任务', emoji: '📅' },
  month: { label: '月任务', emoji: '🗓️' },
  quarter: { label: '季任务', emoji: '🍂' },
  year: { label: '年任务', emoji: '🧭' },
};

/**
 * Canonical task cadence taxonomy. Dates can affect urgency/ranking but never
 * change the cadence row a task belongs to.
 */
export function getTaskCadence(item: Item): TaskCadenceKey {
  const recurrence = getTaskRecurrenceInfo(item);
  if (!recurrence) return 'routine';
  if (recurrence.unit === 'day') return 'day';
  if (recurrence.unit === 'week') return 'week';
  if (recurrence.unit === 'year') return 'year';
  if (recurrence.unit === 'quarter') return 'quarter';
  return 'month';
}
