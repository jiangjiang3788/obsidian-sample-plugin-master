import type {
  RecordEntity,
  RecordTaskPriority,
  TaskRecordEntity as RuntimeTaskRecord,
  TaskSeriesRecordEntity as RuntimeTaskSeriesRecord,
} from '@/core/records/RecordEntity';
import type { TaskRolloverPolicy } from './taskRecurrence';
import type { TaskStatus } from './taskStatus';

export type TaskPriority = RecordTaskPriority;
export type TaskDemandLevel = 'low' | 'medium' | 'high';
export type TaskSeriesStatus = 'active' | 'stopped';
export type TaskRecord = RuntimeTaskRecord;
export type TaskSeriesRecord = RuntimeTaskSeriesRecord;

export function asTaskRecord(record: RecordEntity | null | undefined): TaskRecord | null {
  if (!record || record.coreBlock !== 'task') return null;
  const candidate = record as Partial<TaskRecord>;
  const status = String(candidate.status || '') as TaskStatus;
  if (!['open', 'done', 'cancelled', 'skipped'].includes(status)) return null;
  return record as TaskRecord;
}

export function asTaskSeriesRecord(record: RecordEntity | null | undefined): TaskSeriesRecord | null {
  if (!record || record.coreBlock !== 'task-series') return null;
  const candidate = record as Partial<TaskSeriesRecord>;
  if (!candidate.recurrenceInfo) return null;
  const status = String(candidate.status || '');
  if (status !== 'active' && status !== 'stopped') return null;
  return record as TaskSeriesRecord;
}

/** Keeps the historical public type name owned by the Task domain. */
export type { TaskRolloverPolicy };
