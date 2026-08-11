import type { Item } from '@/core/types/schema';
import type { RecurrenceInfo, TaskRolloverPolicy } from './taskRecurrence';
import type { TaskStatus } from './taskStatus';

export type TaskPriority = 'lowest' | 'low' | 'medium' | 'high' | 'highest';
export type TaskDemandLevel = 'low' | 'medium' | 'high';
export type TaskSeriesStatus = 'active' | 'stopped';

export interface TaskRecord extends Item {
  coreBlock: 'task';
  status: TaskStatus;
  seriesId?: string;
}

export interface TaskSeriesRecord extends Item {
  coreBlock: 'task-series';
  status: TaskSeriesStatus;
  recurrenceInfo: RecurrenceInfo;
  seriesStartDate?: string;
  currentTaskId?: string;
  rolloverPolicy?: TaskRolloverPolicy;
}

export function asTaskRecord(item: Item | null | undefined): TaskRecord | null {
  if (!item || item.coreBlock !== 'task') return null;
  const status = String(item.status || '') as TaskStatus;
  if (!['open', 'done', 'cancelled', 'skipped'].includes(status)) return null;
  return item as TaskRecord;
}

export function asTaskSeriesRecord(item: Item | null | undefined): TaskSeriesRecord | null {
  if (!item || item.coreBlock !== 'task-series') return null;
  if (!item.recurrenceInfo) return null;
  const status = String(item.status || '');
  if (status !== 'active' && status !== 'stopped') return null;
  return item as TaskSeriesRecord;
}
