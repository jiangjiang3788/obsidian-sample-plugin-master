import type { TaskSessionCreateInput } from './taskSession';

export interface TimelineCompletedExecutionCaptureContext {
  kind: 'timeline_create';
  captureMode: 'completed_execution';
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readString(value: unknown): string {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const option = value as Record<string, unknown>;
    return String(option.value ?? option.label ?? '').trim();
  }
  return String(value ?? '').trim();
}

function readTimelineCompletedExecutionContext(
  context?: Record<string, unknown> | null,
): TimelineCompletedExecutionCaptureContext | null {
  const ui = readRecord(context?.__recordUiContext);
  if (ui.kind !== 'timeline_create' || ui.captureMode !== 'completed_execution') return null;
  return { kind: 'timeline_create', captureMode: 'completed_execution' };
}

function normalizeDateTime(value: unknown): { iso: string; ms: number } | null {
  const raw = readString(value).replace(' ', 'T');
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return null;
  return { iso: new Date(ms).toISOString(), ms };
}

function durationMinutes(startedMs: number, endedMs: number): number {
  return Math.round(((endedMs - startedMs) / 60_000) * 100) / 100;
}

/**
 * Translate Timeline's invocation context into the canonical execution fact.
 *
 * Important boundaries:
 * - Timeline/QuickInput still owns interactive forward/backward time calculation.
 * - This function only consumes the finalized Task values after that calculation.
 * - Missing/invalid ranges do not fabricate a Session; the Task create path stays valid.
 * - Legacy Task startAt/endAt remains readable for old records, but new Timeline execution facts belong to TaskSession.
 */
export function buildTimelineCompletedExecutionSessionInput(input: {
  context?: Record<string, unknown> | null;
  taskFields: Record<string, unknown>;
}): TaskSessionCreateInput | null {
  if (!readTimelineCompletedExecutionContext(input.context)) return null;
  if (readString(input.taskFields.status).toLowerCase() !== 'done') return null;

  const started = normalizeDateTime(input.taskFields.startAt);
  const ended = normalizeDateTime(input.taskFields.endAt);
  if (!started || !ended || ended.ms <= started.ms) return null;

  const duration = durationMinutes(started.ms, ended.ms);
  if (!Number.isFinite(duration) || duration <= 0) return null;

  return {
    startedAt: started.iso,
    endedAt: ended.iso,
    durationMinutes: duration,
    result: 'task-completed',
    source: 'timeline',
  };
}


export interface TimelineCompletedExecutionPersistence {
  taskFields: Record<string, unknown>;
  session: TaskSessionCreateInput | null;
}

/**
 * V4 execution cutover for Timeline quick-capture.
 *
 * The finalized reverse/forward range is first captured as a TaskSession. Once a
 * valid Session exists, the Task itself must not duplicate that actual range or
 * store actual duration in expectedDurationMinutes. completedAt remains a Task
 * lifecycle fact and is anchored to the execution end.
 *
 * Ordinary QuickInput and legacy records are intentionally untouched.
 */
export function buildTimelineCompletedExecutionPersistence(input: {
  context?: Record<string, unknown> | null;
  taskFields: Record<string, unknown>;
}): TimelineCompletedExecutionPersistence {
  const session = buildTimelineCompletedExecutionSessionInput(input);
  if (!session) return { taskFields: { ...input.taskFields }, session: null };

  const taskFields = { ...input.taskFields };
  delete taskFields.startAt;
  delete taskFields.endAt;
  delete taskFields.expectedDurationMinutes;
  taskFields.completedAt = readString(taskFields.completedAt) || session.endedAt;

  return { taskFields, session };
}
