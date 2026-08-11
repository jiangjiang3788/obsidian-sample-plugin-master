import type { Item } from '@/core/types/schema';
import { dayjs, normalizeDateStr } from '@/core/utils/date';

export type RecurrenceUnit = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type RecurrenceAnchor = 'scheduled' | 'start' | 'due' | 'completion';
export type TaskRolloverPolicy = 'carry';

/** Canonical Task Series recurrence. It is persisted as structured fields, never parsed from Markdown prose. */
export interface RecurrenceInfo {
  interval: number;
  unit: RecurrenceUnit;
  anchor: RecurrenceAnchor;
}

const RECURRENCE_UNITS = new Set<RecurrenceUnit>(['day', 'week', 'month', 'quarter', 'year']);
const RECURRENCE_ANCHORS = new Set<RecurrenceAnchor>(['scheduled', 'start', 'due', 'completion']);

export function normalizeRecurrenceInfo(value: Partial<RecurrenceInfo> | null | undefined): RecurrenceInfo | null {
  if (!value) return null;
  const unit = String(value.unit || '').trim().toLowerCase() as RecurrenceUnit;
  const anchor = String(value.anchor || '').trim().toLowerCase() as RecurrenceAnchor;
  const interval = Number(value.interval);
  if (!RECURRENCE_UNITS.has(unit)) return null;
  if (!RECURRENCE_ANCHORS.has(anchor)) return null;
  if (!Number.isInteger(interval) || interval < 1) return null;
  return { unit, interval, anchor };
}

/** Canonical accessor. No rawSource / recurrence string fallback is intentionally provided. */
export function getTaskRecurrenceInfo(item: Pick<Item, 'recurrenceInfo'>): RecurrenceInfo | null {
  return normalizeRecurrenceInfo(item.recurrenceInfo);
}

export function isTaskRecurring(item: Pick<Item, 'seriesId'>): boolean {
  return Boolean(String(item.seriesId || '').trim());
}

export function formatTaskRecurrence(info: RecurrenceInfo | null | undefined): string {
  const recurrence = normalizeRecurrenceInfo(info);
  if (!recurrence) return '';
  const interval = recurrence.interval === 1 ? '' : `${recurrence.interval} `;
  return `every ${interval}${recurrence.unit}${recurrence.interval === 1 ? '' : 's'}`;
}

export function addRecurrenceToDate(baseDateISO: string, recurrence: RecurrenceInfo): string {
  const normalizedBase = normalizeDateStr(baseDateISO) || baseDateISO;
  const base = dayjs(normalizedBase, ['YYYY-MM-DD', 'YYYY/MM/DD']);
  if (!base.isValid()) throw new Error(`task_recurrence_invalid_base_date:${baseDateISO}`);
  const next = recurrence.unit === 'quarter'
    ? base.add(recurrence.interval * 3, 'month')
    : base.add(recurrence.interval, recurrence.unit);
  return next.format('YYYY-MM-DD');
}

export function getTaskRecurrenceBaseDate(
  task: Pick<Item, 'scheduledDate' | 'startDate' | 'dueDate' | 'completedAt'>,
  recurrence: RecurrenceInfo,
  completedAtISO: string,
): string {
  const completionDate = normalizeDateStr(completedAtISO) || String(completedAtISO || '').slice(0, 10);
  if (recurrence.anchor === 'completion') return completionDate;
  if (recurrence.anchor === 'start') return task.startDate || task.scheduledDate || task.dueDate || completionDate;
  if (recurrence.anchor === 'due') return task.dueDate || task.scheduledDate || task.startDate || completionDate;
  return task.scheduledDate || task.startDate || task.dueDate || completionDate;
}

export function buildNextOccurrenceDates(
  task: Pick<Item, 'scheduledDate' | 'startDate' | 'dueDate' | 'completedAt'>,
  recurrence: RecurrenceInfo,
  completedAtISO: string,
): Pick<Item, 'scheduledDate' | 'startDate' | 'dueDate'> {
  const baseDate = getTaskRecurrenceBaseDate(task, recurrence, completedAtISO);
  const nextAnchorDate = addRecurrenceToDate(baseDate, recurrence);

  const result: Pick<Item, 'scheduledDate' | 'startDate' | 'dueDate'> = {};
  const shift = (value?: string): string | undefined => {
    if (!value) return undefined;
    return addRecurrenceToDate(value, recurrence);
  };

  if (recurrence.anchor === 'scheduled') result.scheduledDate = nextAnchorDate;
  else result.scheduledDate = shift(task.scheduledDate);

  if (recurrence.anchor === 'start') result.startDate = nextAnchorDate;
  else result.startDate = shift(task.startDate);

  if (recurrence.anchor === 'due') result.dueDate = nextAnchorDate;
  else result.dueDate = shift(task.dueDate);

  // completion-anchored series with no explicit dates still need an actionable next occurrence.
  if (recurrence.anchor === 'completion' && !result.scheduledDate && !result.startDate && !result.dueDate) {
    result.scheduledDate = nextAnchorDate;
  }

  return result;
}
