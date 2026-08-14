// src/features/settings/views/runtime/timeline-parser.ts
// Timeline projection accepts two execution representations:
// 1) persisted TaskSession records (timer / energy execution history), and
// 2) a Task's own startAt/endAt range for manual quick-entry records.
//
// If a Task has at least one valid TaskSession, Session history wins and the Task's
// own range is not projected again. This prevents duplicate blocks while keeping
// manual records visible without forcing users to understand TaskSession.

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

function taskFileName(task: RecordViewItem): string {
  return task.file?.basename || task.filename || task.fileName || '';
}

function buildTimelineTask(args: {
  task: RecordViewItem;
  id: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  sessionRecordId?: string;
  timelineSource: 'task-session' | 'task-range';
}): TimelineTask | null {
  const startedMs = timestamp(args.startedAt);
  const endedMs = timestamp(args.endedAt);
  if (startedMs == null || endedMs == null || endedMs < startedMs) return null;
  if (!Number.isFinite(args.durationMinutes) || args.durationMinutes <= 0) return null;

  const actualStartDate = localDate(args.startedAt);
  const startMinute = localMinute(args.startedAt);
  if (!actualStartDate || startMinute == null) return null;

  const fileName = taskFileName(args.task);
  if (!fileName) return null;

  return {
    ...args.task,
    id: args.id,
    sessionRecordId: args.sessionRecordId,
    taskRecordId: args.task.id,
    timelineSource: args.timelineSource,
    date: actualStartDate,
    doneDate: actualStartDate,
    startTime: new Date(startedMs).toTimeString().slice(0, 5),
    endTime: new Date(endedMs).toTimeString().slice(0, 5),
    duration: args.durationMinutes,
    startMinute,
    // Keep endMinute monotonic across midnight. splitTaskIntoDayBlocks() will split it per day.
    endMinute: startMinute + args.durationMinutes,
    pureText: displayText(args.task),
    fileName,
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
    timelineSource: 'task-session',
    startedAt: session.sessionStartedAt,
    endedAt: session.sessionEndedAt,
    durationMinutes: duration,
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
    if (!Number.isFinite(declaredDuration) || declaredDuration <= 0) return null;
    duration = declaredDuration;
    endedAt = new Date(startedMs + declaredDuration * 60000).toISOString();
  }

  return buildTimelineTask({
    task,
    id: task.id,
    timelineSource: 'task-range',
    startedAt: task.startAt,
    endedAt,
    durationMinutes: duration,
  });
}

/**
 * Convert persisted execution facts into TimelineTask projections.
 *
 * Priority:
 * - TaskSession is authoritative when valid Session records exist for a Task.
 * - Otherwise a Task with startAt + endAt (or startAt + expectedDurationMinutes)
 *   is treated as a manual time-range record and is displayed directly.
 *
 * Task lifecycle status is intentionally not consulted. open/done describes lifecycle;
 * start/end describes time occupancy. They are independent facts.
 */
export function processItemsToTimelineTasks(records: RecordViewItem[]): TimelineTask[] {
  const byId = new Map(records.map((record) => [record.id, record] as const));
  const timelineTasks: TimelineTask[] = [];
  const taskIdsWithProjectedSessions = new Set<string>();

  // Session projection comes first so it can suppress the Task-range fallback only when
  // there is an actually valid, renderable Session.
  for (const record of records) {
    const session = asTaskSessionRecord(record);
    if (!session) continue;
    const task = byId.get(session.taskId);
    if (!task || task.coreBlock !== 'task') continue;

    const projected = projectSession(task, record);
    if (!projected) continue;
    timelineTasks.push(projected);
    taskIdsWithProjectedSessions.add(task.id);
  }

  for (const record of records) {
    if (record.coreBlock !== 'task' || taskIdsWithProjectedSessions.has(record.id)) continue;
    const projected = projectTaskRange(record);
    if (projected) timelineTasks.push(projected);
  }

  return timelineTasks;
}

export { splitTaskIntoDayBlocks };
