// src/features/settings/views/runtime/timeline-parser.ts
// Timeline projection renders planning and execution as separate layers:
// 1) Task.scheduledAt + expectedDurationMinutes as the planned layer,
// 2) persisted TaskSession records as authoritative actual execution, and
// 3) legacy Task startAt/endAt ranges as actual compatibility fallback.
//
// A planned slot remains visible alongside actual Sessions. Legacy Task ranges are
// suppressed only when a valid Session exists, preventing duplicate actual blocks.

import type { RecordViewItem } from '@core/types/public';
import { splitTaskIntoDayBlocks } from '@core/utils/public';
import { asTaskRecord, asTaskSessionRecord } from '@core/records/public';

export type { TimelineTask, TaskBlock } from '@core/types/public';
import type { TimelineTask } from '@core/types/public';

function normalizedDateTime(value: string): string {
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(raw)) {
    return raw.replace(' ', 'T');
  }
  return raw;
}

function timestamp(value: string): number | null {
  const ms = Date.parse(normalizedDateTime(value));
  return Number.isFinite(ms) ? ms : null;
}

function localDate(value: string): string | null {
  const ms = timestamp(value);
  if (ms == null) return null;
  const date = new Date(ms);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function localMinute(value: string): number | null {
  const ms = timestamp(value);
  if (ms == null) return null;
  const date = new Date(ms);
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

function displayText(task: RecordViewItem): string {
  return String(task.content || task.editableText || task.title || '').trim();
}


function buildTimelineTask(args: {
  task: RecordViewItem;
  id: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  sessionRecordId?: string;
  sessionResult?: 'work-block-ended' | 'task-completed';
  timelineSource: 'task-session' | 'task-plan' | 'task-range';
  persistenceRecordId: string;
}): TimelineTask | null {
  const startedMs = timestamp(args.startedAt);
  const endedMs = timestamp(args.endedAt);
  if (startedMs == null || endedMs == null || endedMs < startedMs) return null;
  if (!Number.isFinite(args.durationMinutes) || args.durationMinutes <= 0) return null;

  const actualStartDate = localDate(args.startedAt);
  const startMinute = localMinute(args.startedAt);
  if (!actualStartDate || startMinute == null) return null;

  return {
    ...args.task,
    id: args.id,
    sessionRecordId: args.sessionRecordId,
    sessionResult: args.sessionResult,
    taskRecordId: args.task.id,
    timelineSource: args.timelineSource,
    timelineEditTarget: { kind: args.timelineSource, recordId: args.persistenceRecordId },
    timelineRange: { start: args.startedAt, end: args.endedAt },
    date: actualStartDate,
    doneDate: actualStartDate,
    startTime: new Date(startedMs).toTimeString().slice(0, 5),
    endTime: new Date(endedMs).toTimeString().slice(0, 5),
    duration: args.durationMinutes,
    startMinute,
    // Keep endMinute monotonic across midnight. splitTaskIntoDayBlocks() will split it per day.
    endMinute: startMinute + args.durationMinutes,
    pureText: displayText(args.task),
    actualStartDate,
  };
}

function buildTimelinePointTask(
  task: RecordViewItem,
  startedAt: string,
  timelineSource: 'task-point' | 'task-plan' = 'task-point',
  projectionId = task.id,
): TimelineTask | null {
  const startedMs = timestamp(startedAt);
  if (startedMs == null) return null;
  const actualStartDate = localDate(startedAt);
  const startMinute = localMinute(startedAt);
  if (!actualStartDate || startMinute == null) return null;

  return {
    ...task,
    id: projectionId,
    sessionRecordId: undefined,
    sessionResult: undefined,
    taskRecordId: task.id,
    timelineSource,
    timelineEditTarget: { kind: timelineSource, recordId: task.id },
    timelineRange: { start: startedAt },
    date: actualStartDate,
    doneDate: actualStartDate,
    startTime: new Date(startedMs).toTimeString().slice(0, 5),
    endTime: undefined,
    duration: 0,
    startMinute,
    endMinute: startMinute,
    pureText: displayText(task),
    actualStartDate,
  };
}

function projectSession(task: RecordViewItem, record: RecordViewItem): TimelineTask | null {
  const session = asTaskSessionRecord(record);
  if (!session) return null;

  const startedMs = timestamp(session.sessionStartedAt);
  const endedMs = timestamp(session.sessionEndedAt);
  if (startedMs == null || endedMs == null || endedMs < startedMs) return null;

  const duration = Number(session.sessionDurationMinutes);
  if (!Number.isFinite(duration) || duration <= 0) return null;

  return buildTimelineTask({
    task,
    id: session.id,
    sessionRecordId: session.id,
    sessionResult: session.sessionResult,
    timelineSource: 'task-session',
    persistenceRecordId: session.id,
    startedAt: session.sessionStartedAt,
    endedAt: session.sessionEndedAt,
    durationMinutes: duration,
  });
}

function projectTaskPlan(taskItem: RecordViewItem): TimelineTask | null {
  const task = asTaskRecord(taskItem);
  if (!task || !task.scheduledAt) return null;

  const startedMs = timestamp(task.scheduledAt);
  if (startedMs == null) return null;
  const declaredDuration = Number(task.expectedDurationMinutes);
  if (!Number.isFinite(declaredDuration) || declaredDuration <= 0) {
    return buildTimelinePointTask(task, task.scheduledAt, 'task-plan', `${task.id}:plan`);
  }

  return buildTimelineTask({
    task,
    id: `${task.id}:plan`,
    timelineSource: 'task-plan',
    persistenceRecordId: task.id,
    startedAt: task.scheduledAt,
    endedAt: new Date(startedMs + declaredDuration * 60_000).toISOString(),
    durationMinutes: declaredDuration,
  });
}

function projectTaskRange(taskItem: RecordViewItem): TimelineTask | null {
  const task = asTaskRecord(taskItem);
  if (!task || !task.startAt) return null;

  const startedMs = timestamp(task.startAt);
  if (startedMs == null) return null;

  let endedAt = String(task.endAt || '').trim();
  let duration = Number.NaN;

  if (endedAt) {
    const endedMs = timestamp(endedAt);
    if (endedMs == null || endedMs < startedMs) return null;
    // A manually declared start/end range is the timeline fact. Prefer it over a stale
    // expectedDurationMinutes value if the two ever disagree.
    duration = (endedMs - startedMs) / 60000;
  } else {
    const declaredDuration = Number(task.expectedDurationMinutes);
    if (!Number.isFinite(declaredDuration) || declaredDuration <= 0) {
      // A planned/open Task may only have a startAt. Keep it visible as a point
      // marker without inventing occupancy or persisting a fake duration.
      return buildTimelinePointTask(task, task.startAt);
    }
    duration = declaredDuration;
    endedAt = new Date(startedMs + declaredDuration * 60000).toISOString();
  }

  return buildTimelineTask({
    task,
    id: task.id,
    timelineSource: 'task-range',
    persistenceRecordId: task.id,
    startedAt: task.startAt,
    endedAt,
    durationMinutes: duration,
  });
}

/**
 * Project Task planning and execution into Timeline layers.
 *
 * - Task.scheduledAt (+ expectedDurationMinutes when present) is the planned layer.
 * - TaskSession is the authoritative actual-execution layer.
 * - Legacy Task.startAt/endAt remains an actual compatibility fallback only when the
 *   Task has no persisted Session history. New actual writes do not use that range.
 *
 * Planning and actual execution may be visible at the same time. Task lifecycle status
 * is independent from both layers; Session history owns its own execution result.
 */
export function processItemsToTimelineTasks(records: RecordViewItem[]): TimelineTask[] {
  const byId = new Map(records.map((record) => [record.id, record] as const));
  const timelineTasks: TimelineTask[] = [];
  const taskIdsWithProjectedSessions = new Set<string>();

  // Actual execution history is always projected from Sessions first.
  for (const record of records) {
    const session = asTaskSessionRecord(record);
    if (!session) continue;
    const task = byId.get(session.taskId);
    if (!task || task.recordType !== 'task') continue;

    const projected = projectSession(task, record);
    if (!projected) continue;
    timelineTasks.push(projected);
    taskIdsWithProjectedSessions.add(task.id);
  }

  for (const record of records) {
    if (record.recordType !== 'task') continue;

    // Planning is an independent layer. A Task may have both a planned slot and
    // one or more actual Sessions without either suppressing the other.
    const planned = projectTaskPlan(record);
    if (planned) timelineTasks.push(planned);

    // Legacy/manual Task ranges remain readable only as an actual fallback when
    // no Session history exists. New actual writes no longer use these fields.
    if (taskIdsWithProjectedSessions.has(record.id)) continue;
    const legacy = projectTaskRange(record);
    if (legacy) timelineTasks.push(legacy);
  }

  return timelineTasks;
}

export { splitTaskIntoDayBlocks };
