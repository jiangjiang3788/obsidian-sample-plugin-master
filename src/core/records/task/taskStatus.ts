export type TaskStatus = 'open' | 'done' | 'cancelled' | 'skipped';
export type TaskLifecycleCommand = 'complete' | 'cancel' | 'skip' | 'reopen';

export interface TaskStatusPresentation {
  status: TaskStatus;
  label: string;
  emoji: string;
  className: TaskStatus;
}

/**
 * Task lifecycle presentation belongs to the Task domain, not to Timeline UI.
 * Persisted values stay stable (`open`/`done`/...), while every surface can reuse
 * the same emoji + label vocabulary.
 */
export const TASK_STATUS_PRESENTATION: Record<TaskStatus, TaskStatusPresentation> = {
  open: { status: 'open', label: '未完成', emoji: '⏳', className: 'open' },
  done: { status: 'done', label: '已完成', emoji: '✅', className: 'done' },
  cancelled: { status: 'cancelled', label: '已取消', emoji: '❌', className: 'cancelled' },
  skipped: { status: 'skipped', label: '已跳过', emoji: '⏭️', className: 'skipped' },
};

type TaskStatusCarrier = { recordType?: string; status?: string };
type IdentifiedTaskStatusCarrier = TaskStatusCarrier & { id: string };

export function isTaskRecord(item: Pick<TaskStatusCarrier, 'recordType'> | null | undefined): boolean {
  return item?.recordType === 'task';
}

export function isTaskSeriesRecord(item: Pick<TaskStatusCarrier, 'recordType'> | null | undefined): boolean {
  return item?.recordType === 'task-series';
}

export function normalizeTaskStatus(value: unknown): TaskStatus | null {
  const status = String(value || '').trim().toLowerCase();
  return status === 'open' || status === 'done' || status === 'cancelled' || status === 'skipped'
    ? status
    : null;
}

export function getTaskStatusPresentation(value: unknown): TaskStatusPresentation {
  const status = normalizeTaskStatus(value) ?? 'open';
  return TASK_STATUS_PRESENTATION[status];
}

export function getTaskStatus(item: TaskStatusCarrier): TaskStatus | null {
  if (!isTaskRecord(item)) return null;
  return normalizeTaskStatus(item.status);
}

export function assertTaskStatus(item: IdentifiedTaskStatusCarrier): TaskStatus {
  const status = getTaskStatus(item);
  if (!status) throw new Error(`task_status_invalid:${item.id}`);
  return status;
}

export function isTaskCompleted(item: TaskStatusCarrier): boolean {
  return getTaskStatus(item) === 'done';
}

export function isTaskOpen(item: TaskStatusCarrier): boolean {
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
