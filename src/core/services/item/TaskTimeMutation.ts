import { asTaskRecord } from '@/core/records/task/taskDomain';
import { asTaskSessionRecord } from '@/core/records/task/taskSession';
import type { RecordRepository } from '@/core/records/RecordRepository';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { TimelineEditTarget, TimelineLogicalRange } from '@/core/types/timeline';
import type { TaskSessionMutation } from './TaskSessionMutation';

function normalizedDateTime(value: string): string {
  const raw = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw) ? raw.replace(' ', 'T') : raw;
}

function timeMs(value: string | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(normalizedDateTime(value));
  return Number.isFinite(ms) ? ms : null;
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

function requireRange(range: TimelineLogicalRange): { startedMs: number; endedMs: number } {
  const startedMs = timeMs(range.start);
  const endedMs = timeMs(range.end);
  if (startedMs == null || endedMs == null || endedMs <= startedMs) {
    throw new Error('timeline_range_time_order_invalid');
  }
  return { startedMs, endedMs };
}

/**
 * Timeline logical-range mutation boundary.
 *
 * The caller supplies an explicit projection semantic + persistence record identity. This class
 * owns the mapping from that semantic to storage fields, so UI code never writes `scheduledAt`,
 * Session fields or legacy Task fields directly.
 */
export class TaskTimeMutation {
  constructor(
    private readonly repository: RecordRepository,
    private readonly taskSessions: TaskSessionMutation,
  ) {}

  async updateTimelineRange(target: TimelineEditTarget, range: TimelineLogicalRange): Promise<RecordViewItem> {
    const record = await this.repository.getById(target.recordId);
    if (!record) throw new Error(`timeline_target_not_found:${target.recordId}`);

    if (target.kind === 'task-session') {
      if (!asTaskSessionRecord(record)) throw new Error(`task_session_required:${target.recordId}`);
      return this.taskSessions.updateSessionTime(target.recordId, range);
    }

    const task = asTaskRecord(record);
    if (!task) throw new Error(`task_record_required:${target.recordId}`);

    if (target.kind === 'task-plan') {
      if (!task.scheduledAt) throw new Error(`task_plan_time_required:${target.recordId}`);
      const startedMs = timeMs(range.start);
      if (startedMs == null) throw new Error('task_plan_time_invalid');

      if (!range.end) {
        await this.repository.update(task.id, { scheduledAt: localDateTime(startedMs) });
      } else {
        const { endedMs } = requireRange(range);
        const durationMinutes = Math.round(((endedMs - startedMs) / 60_000) * 100) / 100;
        await this.repository.update(task.id, {
          scheduledAt: localDateTime(startedMs),
          expectedDurationMinutes: durationMinutes,
        });
      }
      return this.requireUpdated(task.id);
    }

    if (target.kind === 'task-point') {
      if (!task.startAt) throw new Error(`task_start_time_required:${target.recordId}`);
      const startedMs = timeMs(range.start);
      if (startedMs == null) throw new Error('task_time_invalid');
      await this.repository.update(task.id, { startAt: localDateTime(startedMs) });
      return this.requireUpdated(task.id);
    }

    if (target.kind === 'task-range') {
      if (!task.startAt) throw new Error(`task_start_time_required:${target.recordId}`);
      const { startedMs, endedMs } = requireRange(range);
      // Legacy actual range stays independent from planning. In particular, changing an actual
      // range must not rewrite expectedDurationMinutes, which is a planning/expectation fact.
      await this.repository.update(task.id, {
        startAt: localDateTime(startedMs),
        endAt: localDateTime(endedMs),
      });
      return this.requireUpdated(task.id);
    }

    const exhaustive: never = target.kind;
    throw new Error(`timeline_target_kind_unsupported:${exhaustive}`);
  }

  private async requireUpdated(recordId: string): Promise<RecordViewItem> {
    const updated = await this.repository.getById(recordId);
    if (!updated) throw new Error(`timeline_time_update_scan_failed:${recordId}`);
    return updated;
  }
}
