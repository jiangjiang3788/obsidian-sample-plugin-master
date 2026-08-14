import type { TaskRecordEntity } from '@/core/records/RecordEntity';
import { dayjs, normalizeDateStr } from '@/core/utils/date';

import type { RecurrenceAnchor, RecurrenceInfo, RecurrenceUnit } from './RecurrenceTypes';
export type { RecurrenceAnchor, RecurrenceInfo, RecurrenceUnit, TaskRolloverPolicy } from './RecurrenceTypes';

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
export function getTaskRecurrenceInfo(item: Pick<TaskRecordEntity, 'recurrenceInfo'>): RecurrenceInfo | null {
  return normalizeRecurrenceInfo(item.recurrenceInfo);
}

export function isTaskRecurring(item: Pick<TaskRecordEntity, 'seriesId'>): boolean {
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

function addRecurrenceToDateTime(baseValue: string, recurrence: RecurrenceInfo): string {
  const raw = String(baseValue || '').trim();
  if (!raw) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return addRecurrenceToDate(raw, recurrence);
  const base = dayjs(raw.replace(' ', 'T'));
  if (!base.isValid()) throw new Error(`task_recurrence_invalid_base_datetime:${baseValue}`);
  const next = recurrence.unit === 'quarter'
    ? base.add(recurrence.interval * 3, 'month')
    : base.add(recurrence.interval, recurrence.unit);
  return next.format('YYYY-MM-DDTHH:mm');
}

type RecurrenceTaskTimeFields = Pick<TaskRecordEntity,
  'scheduledAt' | 'startAt' | 'dueAt' | 'scheduledDate' | 'startDate' | 'dueDate' | 'completedAt'>;
type NextOccurrenceTimes = Pick<TaskRecordEntity,
  'scheduledAt' | 'startAt' | 'dueAt' | 'scheduledDate' | 'startDate' | 'dueDate'>;
function firstTime(...values: Array<string | undefined>): string | undefined {
  return values.find(value => Boolean(String(value || '').trim()));
}

export function getTaskRecurrenceBaseDate(task: RecurrenceTaskTimeFields, recurrence: RecurrenceInfo, completedAtISO: string): string {
  const completion = String(completedAtISO || '').trim();
  if (recurrence.anchor === 'completion') return completion;
  if (recurrence.anchor === 'start') return firstTime(task.startAt, task.startDate, task.scheduledAt, task.scheduledDate, task.dueAt, task.dueDate) || completion;
  if (recurrence.anchor === 'due') return firstTime(task.dueAt, task.dueDate, task.startAt, task.startDate, task.scheduledAt, task.scheduledDate) || completion;
  return firstTime(task.scheduledAt, task.scheduledDate, task.startAt, task.startDate, task.dueAt, task.dueDate) || completion;
}

export function buildNextOccurrenceDates(task: RecurrenceTaskTimeFields, recurrence: RecurrenceInfo, completedAtISO: string): NextOccurrenceTimes {
  const base = getTaskRecurrenceBaseDate(task, recurrence, completedAtISO);
  const nextAnchor = addRecurrenceToDateTime(base, recurrence);
  const result: NextOccurrenceTimes = {};
  const shift = (value?: string): string | undefined => value ? addRecurrenceToDateTime(value, recurrence) : undefined;
  if (recurrence.anchor === 'scheduled') {
    if (task.scheduledAt) result.scheduledAt = nextAnchor; else result.scheduledDate = nextAnchor.slice(0, 10);
  } else { result.scheduledAt = shift(task.scheduledAt); result.scheduledDate = shift(task.scheduledDate)?.slice(0, 10); }
  if (recurrence.anchor === 'start') result.startAt = nextAnchor;
  else { result.startAt = shift(task.startAt); result.startDate = shift(task.startDate)?.slice(0, 10); }
  if (recurrence.anchor === 'due') {
    if (task.dueAt) result.dueAt = nextAnchor; else result.dueDate = nextAnchor.slice(0, 10);
  } else { result.dueAt = shift(task.dueAt); result.dueDate = shift(task.dueDate)?.slice(0, 10); }
  if (recurrence.anchor === 'completion' && !result.scheduledAt && !result.scheduledDate && !result.startAt && !result.startDate && !result.dueAt && !result.dueDate) result.startAt = nextAnchor;
  return result;
}
