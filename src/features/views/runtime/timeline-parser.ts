// src/features/settings/views/runtime/timeline-parser.ts
// Timeline execution history is projected exclusively from persisted TaskSession records.
// Task records provide display metadata; TaskSession owns start/end/duration facts.

import type { RecordViewItem } from '@core/types/public';
import { splitTaskIntoDayBlocks } from '@core/utils/public';
import { asTaskSessionRecord } from '@core/records/public';

export type { TimelineTask, TaskBlock } from '@core/types/public';
import type { TimelineTask } from '@core/types/public';

function localDate(value: string): string | null {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function localMinute(value: string): number | null {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

function displayText(task: RecordViewItem): string {
  return String(task.content || task.editableText || task.title || '').trim();
}

/**
 * Convert persisted TaskSession records into TimelineTask projections.
 * No Task status/category/raw Markdown grammar is consulted here.
 */
export function processItemsToTimelineTasks(records: RecordViewItem[]): TimelineTask[] {
  const byId = new Map(records.map((record) => [record.id, record] as const));
  const timelineTasks: TimelineTask[] = [];

  for (const record of records) {
    const session = asTaskSessionRecord(record);
    if (!session) continue;
    const task = byId.get(session.taskId);
    if (!task || task.coreBlock !== 'task') continue;

    const startedMs = Date.parse(session.sessionStartedAt);
    const endedMs = Date.parse(session.sessionEndedAt);
    if (!Number.isFinite(startedMs) || !Number.isFinite(endedMs) || endedMs < startedMs) continue;

    const actualStartDate = localDate(session.sessionStartedAt);
    const startMinute = localMinute(session.sessionStartedAt);
    if (!actualStartDate || startMinute == null) continue;

    const duration = Number(session.sessionDurationMinutes);
    if (!Number.isFinite(duration) || duration < 0) continue;
    const endMinute = startMinute + duration;
    const fileName = task.file?.basename || task.filename || '';
    if (!fileName) continue;

    timelineTasks.push({
      ...task,
      // A Timeline row represents an execution fact, so its identity is the Session identity.
      id: session.id,
      sessionRecordId: session.id,
      taskRecordId: task.id,
      date: actualStartDate,
      doneDate: actualStartDate,
      startTime: new Date(startedMs).toTimeString().slice(0, 5),
      endTime: new Date(endedMs).toTimeString().slice(0, 5),
      duration,
      startMinute,
      endMinute,
      pureText: displayText(task),
      fileName,
      actualStartDate,
    });
  }

  return timelineTasks;
}

export { splitTaskIntoDayBlocks };
