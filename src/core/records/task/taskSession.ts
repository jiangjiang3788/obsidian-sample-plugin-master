import type { Item } from '@/core/types/schema';
import type { TaskSessionCreateInput, TaskSessionResult, TaskSessionSource } from '@/core/types/timer';

export type { TaskSessionCreateInput, TaskSessionResult, TaskSessionSource } from '@/core/types/timer';

export interface TaskSessionRecord extends Item {
  coreBlock: 'task-session';
  taskId: string;
  sessionStartedAt: string;
  sessionEndedAt: string;
  sessionDurationMinutes: number;
  sessionResult: TaskSessionResult;
  sessionSource: TaskSessionSource;
  suggestedDurationMinutes?: number;
  startEnergyRecordId?: string;
  endEnergyRecordId?: string;
  energyDelta?: number;
  brainDelta?: number;
  physicalDelta?: number;
}


export function normalizeTaskSessionDurationMinutes(value: unknown): number | null {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(number * 100) / 100;
}

export function buildTaskSessionFields(task: Item, input: TaskSessionCreateInput): Record<string, unknown> {
  const durationMinutes = normalizeTaskSessionDurationMinutes(input.durationMinutes);
  if (durationMinutes == null) throw new Error('task_session_duration_invalid');
  if (!input.startedAt || !Number.isFinite(Date.parse(input.startedAt))) throw new Error('task_session_started_at_invalid');
  if (!input.endedAt || !Number.isFinite(Date.parse(input.endedAt))) throw new Error('task_session_ended_at_invalid');
  if (Date.parse(input.endedAt) < Date.parse(input.startedAt)) throw new Error('task_session_time_order_invalid');
  if (!['work-block-ended', 'task-completed'].includes(input.result)) throw new Error('task_session_result_invalid');
  if (!['timer', 'energy-view', 'unknown'].includes(input.source)) throw new Error('task_session_source_invalid');

  return {
    taskId: task.id,
    seriesId: task.seriesId,
    goalId: task.goalId,
    goalPath: task.goalPath || task.goalPaths?.[0],
    themePath: task.themePath || task.theme,
    sessionStartedAt: input.startedAt,
    sessionEndedAt: input.endedAt,
    sessionDurationMinutes: durationMinutes,
    sessionResult: input.result,
    sessionSource: input.source,
    suggestedDurationMinutes: input.suggestedDurationMinutes,
    startEnergyRecordId: input.startEnergyRecordId,
  };
}

export function asTaskSessionRecord(item: Item | null | undefined): TaskSessionRecord | null {
  if (!item || item.coreBlock !== 'task-session') return null;
  if (!item.taskId) return null;
  if (!item.sessionStartedAt || !Number.isFinite(Date.parse(item.sessionStartedAt))) return null;
  if (!item.sessionEndedAt || !Number.isFinite(Date.parse(item.sessionEndedAt))) return null;
  if (normalizeTaskSessionDurationMinutes(item.sessionDurationMinutes) == null) return null;
  if (!['work-block-ended', 'task-completed'].includes(String(item.sessionResult || ''))) return null;
  if (!['timer', 'energy-view', 'unknown'].includes(String(item.sessionSource || ''))) return null;
  return item as TaskSessionRecord;
}
