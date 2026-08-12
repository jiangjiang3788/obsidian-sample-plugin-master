import type { RecordEntity, TaskRecordEntity, TaskSessionRecordEntity as RuntimeTaskSessionRecord } from '@/core/records/RecordEntity';
import type { TaskSessionCreateInput, TaskSessionResult, TaskSessionSource } from '@/core/types/timer';

export type { TaskSessionCreateInput, TaskSessionResult, TaskSessionSource } from '@/core/types/timer';
export type TaskSessionRecord = RuntimeTaskSessionRecord;

export function normalizeTaskSessionDurationMinutes(value: unknown): number | null {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(number * 100) / 100;
}

export function buildTaskSessionFields(task: TaskRecordEntity, input: TaskSessionCreateInput): Record<string, unknown> {
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

export function asTaskSessionRecord(record: RecordEntity | null | undefined): TaskSessionRecord | null {
  if (!record || record.coreBlock !== 'task-session') return null;
  const candidate = record as Partial<TaskSessionRecord>;
  if (!candidate.taskId) return null;
  if (!candidate.sessionStartedAt || !Number.isFinite(Date.parse(candidate.sessionStartedAt))) return null;
  if (!candidate.sessionEndedAt || !Number.isFinite(Date.parse(candidate.sessionEndedAt))) return null;
  if (normalizeTaskSessionDurationMinutes(candidate.sessionDurationMinutes) == null) return null;
  if (!['work-block-ended', 'task-completed'].includes(String(candidate.sessionResult || ''))) return null;
  if (!['timer', 'energy-view', 'unknown'].includes(String(candidate.sessionSource || ''))) return null;
  return record as TaskSessionRecord;
}
