import { asTaskRecord } from '@/core/records/task/taskDomain';
import { asTaskSessionRecord } from '@/core/records/task/taskSession';
import type { RecordRepository } from '@/core/records/RecordRepository';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { ItemTimeUpdates } from './types';
import type { TaskSessionMutation } from './TaskSessionMutation';

function parseClock(value: string): { hours: number; minutes: number } | null {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

function normalizedDateTime(value: string): string {
  const raw = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw) ? raw.replace(' ', 'T') : raw;
}

function timeMs(value: string | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(normalizedDateTime(value));
  return Number.isFinite(ms) ? ms : null;
}

function withLocalClock(baseMs: number, value: string): number {
  const clock = parseClock(value);
  if (!clock) throw new Error('task_time_clock_invalid');
  const date = new Date(baseMs);
  date.setHours(clock.hours, clock.minutes, 0, 0);
  return date.getTime();
}

function localDateTime(ms: number): string {
  const date = new Date(ms);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function roundMinutes(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Timeline time editing dispatcher.
 *
 * A Timeline block can represent either a TaskSession or a Task manual range. The UI
 * sends only the visible block Record ID; this mutation resolves the domain kind and
 * updates the correct storage fields without making shared UI understand the distinction.
 */
export class TaskTimeMutation {
  constructor(
    private readonly repository: RecordRepository,
    private readonly taskSessions: TaskSessionMutation,
  ) {}

  async update(recordId: string, updates: ItemTimeUpdates): Promise<RecordViewItem> {
    const record = await this.repository.getById(recordId);
    if (asTaskSessionRecord(record)) return this.taskSessions.updateSessionTime(recordId, updates);

    const task = asTaskRecord(record);
    if (!task) throw new Error(`task_or_session_required:${recordId}`);
    if (!task.startAt) throw new Error(`task_start_time_required:${recordId}`);

    let startedMs = timeMs(task.startAt);
    if (startedMs == null) throw new Error('task_time_invalid');

    const persistedEndMs = timeMs(task.endAt);
    const declaredDuration = Number(task.expectedDurationMinutes);
    let originalDuration = persistedEndMs != null && persistedEndMs >= startedMs
      ? (persistedEndMs - startedMs) / 60_000
      : declaredDuration;
    if (!Number.isFinite(originalDuration) || originalDuration <= 0) throw new Error('task_duration_invalid');

    let endedMs = persistedEndMs != null && persistedEndMs >= startedMs
      ? persistedEndMs
      : startedMs + originalDuration * 60_000;

    if (updates.time) startedMs = withLocalClock(startedMs, updates.time);

    if (updates.endTime) {
      endedMs = withLocalClock(endedMs, updates.endTime);
      if (endedMs < startedMs) endedMs += 86_400_000;
    } else if (updates.duration != null || updates.time) {
      const duration = updates.duration != null ? Number(updates.duration) : originalDuration;
      if (!Number.isFinite(duration) || duration <= 0) throw new Error('task_duration_invalid');
      endedMs = startedMs + duration * 60_000;
    }

    if (!Number.isFinite(startedMs) || !Number.isFinite(endedMs) || endedMs <= startedMs) {
      throw new Error('task_time_order_invalid');
    }

    originalDuration = roundMinutes((endedMs - startedMs) / 60_000);
    await this.repository.update(task.id, {
      startAt: localDateTime(startedMs),
      endAt: localDateTime(endedMs),
      expectedDurationMinutes: originalDuration,
    });

    const updated = await this.repository.getById(task.id);
    if (!updated) throw new Error(`task_time_update_scan_failed:${task.id}`);
    return updated;
  }
}
