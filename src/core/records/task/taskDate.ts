import type { TaskRecordEntity } from '@/core/records/RecordEntity';

export type TaskDateFactRole = 'default' | 'scheduled' | 'due' | 'completed';
export type TaskPrimaryDateSource = 'scheduled' | 'due' | 'start' | 'created' | 'done' | 'end';

export interface TaskDateFact {
  value?: string;
  source?: TaskPrimaryDateSource;
}

function firstDate(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }
  return undefined;
}

/**
 * Task date facts are independent facts, not aliases for one mutable "task date".
 *
 * `default` exists only for generic entity views that still require one stable date.
 * It deliberately prefers planning/legacy placement/creation before completion so a
 * Task does not jump to another day merely because its lifecycle status changes.
 * Explicit planned/due/completed views should request their own fact instead.
 */
export function getTaskDateFact(task: Pick<
  TaskRecordEntity,
  | 'scheduledAt'
  | 'scheduledDate'
  | 'dueAt'
  | 'dueDate'
  | 'startAt'
  | 'startDate'
  | 'startISO'
  | 'createdAt'
  | 'createdDate'
  | 'completedAt'
  | 'doneDate'
  | 'endAt'
  | 'endISO'
>, role: TaskDateFactRole = 'default'): TaskDateFact {
  if (role === 'scheduled') {
    return { value: firstDate(task.scheduledAt, task.scheduledDate), source: 'scheduled' };
  }
  if (role === 'due') {
    return { value: firstDate(task.dueAt, task.dueDate), source: 'due' };
  }
  if (role === 'completed') {
    return { value: firstDate(task.completedAt, task.doneDate), source: 'done' };
  }

  const candidates: Array<[TaskPrimaryDateSource, string | undefined]> = [
    ['scheduled', firstDate(task.scheduledAt, task.scheduledDate)],
    ['due', firstDate(task.dueAt, task.dueDate)],
    ['start', firstDate(task.startAt, task.startDate, task.startISO)],
    ['created', firstDate(task.createdAt, task.createdDate)],
    ['done', firstDate(task.completedAt, task.doneDate)],
    ['end', firstDate(task.endAt, task.endISO)],
  ];
  for (const [source, value] of candidates) {
    if (value) return { value, source };
  }
  return {};
}
