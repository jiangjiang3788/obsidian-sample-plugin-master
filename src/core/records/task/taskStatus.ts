import type { Item } from '@/core/types/schema';

export type TaskStatus = 'open' | 'done' | 'cancelled' | 'skipped';
export type TaskLifecycleCommand = 'complete' | 'cancel' | 'skip' | 'reopen';

export function isTaskRecord(item: Pick<Item, 'coreBlock'> | null | undefined): boolean {
  return item?.coreBlock === 'task';
}

export function isTaskSeriesRecord(item: Pick<Item, 'coreBlock'> | null | undefined): boolean {
  return item?.coreBlock === 'task-series';
}

export function getTaskStatus(item: Pick<Item, 'coreBlock' | 'status'>): TaskStatus | null {
  if (!isTaskRecord(item)) return null;
  const status = String(item.status || '').trim().toLowerCase();
  return status === 'open' || status === 'done' || status === 'cancelled' || status === 'skipped'
    ? status
    : null;
}

export function assertTaskStatus(item: Pick<Item, 'id' | 'coreBlock' | 'status'>): TaskStatus {
  const status = getTaskStatus(item);
  if (!status) throw new Error(`task_status_invalid:${item.id}`);
  return status;
}

export function isTaskCompleted(item: Pick<Item, 'coreBlock' | 'status'>): boolean {
  return getTaskStatus(item) === 'done';
}

export function isTaskOpen(item: Pick<Item, 'coreBlock' | 'status'>): boolean {
  return getTaskStatus(item) === 'open';
}

export function canTransitionTaskStatus(
  from: TaskStatus,
  command: TaskLifecycleCommand,
  options: { recurring: boolean },
): boolean {
  if (command === 'reopen') return from === 'done' || from === 'cancelled' || from === 'skipped';
  if (from !== 'open') return false;
  if (command === 'skip') return options.recurring;
  if (command === 'cancel') return !options.recurring;
  return command === 'complete';
}

export function nextTaskStatus(command: TaskLifecycleCommand): TaskStatus {
  if (command === 'complete') return 'done';
  if (command === 'cancel') return 'cancelled';
  if (command === 'skip') return 'skipped';
  return 'open';
}
