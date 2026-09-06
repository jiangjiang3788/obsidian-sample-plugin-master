import type { RecurrenceInfo } from './taskRecurrence';

/**
 * Explicit edit scopes for a recurring Task occurrence.
 *
 * current:
 *   mutate only the selected Task occurrence. TaskSeries stays untouched.
 * current_and_future:
 *   mutate the selected occurrence through the normal Task edit path, then
 *   update TaskSeries defaults/rule for occurrences generated afterwards.
 * series_rules:
 *   mutate TaskSeries defaults/rule only. The selected Task and immutable
 *   historical occurrences are not rewritten.
 */
export type TaskSeriesEditScope = 'current' | 'current_and_future' | 'series_rules';

export interface TaskSeriesEditIntent {
  scope: TaskSeriesEditScope;
  recurrence?: RecurrenceInfo;
}

const SCOPES = new Set<TaskSeriesEditScope>(['current', 'current_and_future', 'series_rules']);

export function normalizeTaskSeriesEditIntent(value: unknown): TaskSeriesEditIntent | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<TaskSeriesEditIntent>;
  const scope = String(candidate.scope || '') as TaskSeriesEditScope;
  if (!SCOPES.has(scope)) return null;
  return {
    scope,
    recurrence: candidate.recurrence ? { ...candidate.recurrence } : undefined,
  };
}


/** A duplicated recurring occurrence becomes an independent one-time Task. */
export function detachTaskSeriesIdentityForDuplicate<T extends Record<string, unknown>>(formData: T): T {
  const next = { ...formData };
  delete next.seriesId;
  delete next['系列ID'];
  return next;
}
