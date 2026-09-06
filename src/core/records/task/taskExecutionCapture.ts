import type { TaskSessionCreateInput } from './taskSession';

export interface CompletedExecutionCaptureContext {
  kind: 'timeline_create' | 'quickinput_create';
  captureMode: 'completed_execution';
  source: 'timeline' | 'unknown';
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

function readCompletedExecutionContext(
  context?: Record<string, unknown> | null,
): CompletedExecutionCaptureContext | null {
  const ui = readRecord(context?.__recordUiContext);
  if (ui.captureMode !== 'completed_execution') return null;
  if (ui.kind === 'timeline_create') {
    return { kind: 'timeline_create', captureMode: 'completed_execution', source: 'timeline' };
  }
  if (ui.kind === 'quickinput_create') {
    return { kind: 'quickinput_create', captureMode: 'completed_execution', source: 'unknown' };
  }
  return null;
}


export function isTimelineCompletedExecutionContext(
  context?: Record<string, unknown> | null,
): boolean {
  return readCompletedExecutionContext(context)?.kind === 'timeline_create';
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
 * Translate create-only completed-execution context into the canonical execution fact.
 *
 * Important boundaries:
 * - QuickInput still owns interactive forward/backward time calculation.
 * - This function only consumes the finalized Task values after that calculation.
 * - Missing/invalid ranges do not fabricate a Session; the Task create path stays valid.
 * - Legacy Task startAt/endAt remains readable for old records, but new completed-create execution facts belong to TaskSession.
 */
export function buildTimelineCompletedExecutionSessionInput(input: {
  context?: Record<string, unknown> | null;
  taskFields: Record<string, unknown>;
}): TaskSessionCreateInput | null {
  const captureContext = readCompletedExecutionContext(input.context);
  if (!captureContext) return null;
  // Timeline `completed_execution` is an invocation contract, not a template hint.
  // A stale/open form status must not downgrade a historical execution into a planned
  // Task. Manual QuickInput completed capture still requires an explicit done status.
  if (captureContext.kind !== 'timeline_create'
    && readString(input.taskFields.status).toLowerCase() !== 'done') return null;

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
    source: captureContext.source,
  };
}


export interface TimelineCompletedExecutionPersistence {
  taskFields: Record<string, unknown>;
  session: TaskSessionCreateInput | null;
}

/**
 * Execution cutover for completed Task creation.
 *
 * The finalized reverse/forward range is first captured as a TaskSession. Once a
 * valid Session exists, the Task itself must not duplicate that actual range or
 * store actual duration in expectedDurationMinutes. completedAt remains a Task
 * lifecycle fact and is anchored to the execution end.
 *
 * Existing-record edit remains untouched because only create flows add the capture context.
 */
export function buildTimelineCompletedExecutionPersistence(input: {
  context?: Record<string, unknown> | null;
  taskFields: Record<string, unknown>;
}): TimelineCompletedExecutionPersistence {
  const session = buildTimelineCompletedExecutionSessionInput(input);
  if (!session) return { taskFields: { ...input.taskFields }, session: null };

  const taskFields = { ...input.taskFields };
  if (isTimelineCompletedExecutionContext(input.context)) taskFields.status = 'done';
  delete taskFields.startAt;
  delete taskFields.endAt;
  delete taskFields.expectedDurationMinutes;
  taskFields.completedAt = readString(taskFields.completedAt) || session.endedAt;

  return { taskFields, session };
}
