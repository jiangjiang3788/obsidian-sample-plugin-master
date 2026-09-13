import type { RecordEntity, TaskRecordEntity, TaskSessionRecordEntity as RuntimeTaskSessionRecord } from '@/core/records/RecordEntity';
import type { TaskSessionCreateInput, TaskSessionResult, TaskSessionSource } from '@/core/types/timer';

export type { TaskSessionCreateInput, TaskSessionResult, TaskSessionSource } from '@/core/types/timer';
export type TaskSessionRecord = RuntimeTaskSessionRecord;

export interface TaskSessionResultPresentation {
  result: TaskSessionResult;
  label: string;
  emoji: string;
  /** Reuse stable Timeline lifecycle style buckets without reading the Task's current status. */
  className: 'open' | 'done';
  status: 'open' | 'done';
}

export const TASK_SESSION_RESULT_PRESENTATION: Record<TaskSessionResult, TaskSessionResultPresentation> = {
  'work-block-ended': { result: 'work-block-ended', label: '工作块已结束', emoji: '▶️', className: 'open', status: 'open' },
  'task-completed': { result: 'task-completed', label: '本次执行已完成任务', emoji: '✅', className: 'done', status: 'done' },
};

export function getTaskSessionResultPresentation(value: unknown): TaskSessionResultPresentation | null {
  const result = String(value || '').trim() as TaskSessionResult;
  return TASK_SESSION_RESULT_PRESENTATION[result] || null;
}

export function normalizeTaskSessionDurationMinutes(value: unknown): number | null {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(number * 100) / 100;
}

export function buildTaskSessionFields(task: Pick<TaskRecordEntity, 'id' | 'seriesId' | 'goalPath'>, input: TaskSessionCreateInput): Record<string, unknown> {
  const durationMinutes = normalizeTaskSessionDurationMinutes(input.durationMinutes);
  if (durationMinutes == null || durationMinutes <= 0) throw new Error('task_session_duration_invalid');
  if (!input.startedAt || !Number.isFinite(Date.parse(input.startedAt))) throw new Error('task_session_started_at_invalid');
  if (!input.endedAt || !Number.isFinite(Date.parse(input.endedAt))) throw new Error('task_session_ended_at_invalid');
  if (Date.parse(input.endedAt) < Date.parse(input.startedAt)) throw new Error('task_session_time_order_invalid');
  if (!['work-block-ended', 'task-completed'].includes(input.result)) throw new Error('task_session_result_invalid');
  if (!['timer', 'energy-view', 'timeline', 'unknown'].includes(input.source)) throw new Error('task_session_source_invalid');

  return {
    taskId: task.id,
    seriesId: task.seriesId,
    goalPath: task.goalPath,
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
  if (!record || record.recordType !== 'task-session') return null;
  const candidate = record as Partial<TaskSessionRecord>;
  if (!candidate.taskId) return null;
  if (!candidate.sessionStartedAt || !Number.isFinite(Date.parse(candidate.sessionStartedAt))) return null;
  if (!candidate.sessionEndedAt || !Number.isFinite(Date.parse(candidate.sessionEndedAt))) return null;
  if (normalizeTaskSessionDurationMinutes(candidate.sessionDurationMinutes) == null) return null;
  if (!['work-block-ended', 'task-completed'].includes(String(candidate.sessionResult || ''))) return null;
  if (!['timer', 'energy-view', 'timeline', 'unknown'].includes(String(candidate.sessionSource || ''))) return null;
  return record as TaskSessionRecord;
}
