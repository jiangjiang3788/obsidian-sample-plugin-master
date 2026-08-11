import type { Item } from '@/core/types/schema';
import type { DataStore } from '../DataStore';
import { RecordRepository, type RecordBatchOperation } from '@/core/records/RecordRepository';
import { createRecordId } from '@/core/records/RecordId';
import { asTaskRecord } from '@/core/records/task/taskDomain';
import { asTaskSessionRecord, buildTaskSessionFields, type TaskSessionCreateInput } from '@/core/records/task/taskSession';
import { readEnergyItemSnapshot } from '@/core/energy/item';
import type { ItemTimeUpdates } from './types';



const ENERGY_FEEDBACK_WINDOW_MINUTES = 120;

function parseClock(value: string): { hours: number; minutes: number } | null {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

function withLocalClock(iso: string, value: string): number {
  const clock = parseClock(value);
  if (!clock) throw new Error('task_session_clock_invalid');
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) throw new Error('task_session_time_invalid');
  date.setHours(clock.hours, clock.minutes, 0, 0);
  return date.getTime();
}

function energyOccurrenceMs(item: Item): number | null {
  const snapshot = readEnergyItemSnapshot(item);
  if (!snapshot?.date || !snapshot.time) return null;
  const value = Date.parse(`${snapshot.date}T${snapshot.time.length === 5 ? `${snapshot.time}:00` : snapshot.time}`);
  return Number.isFinite(value) ? value : null;
}

export interface PreparedTaskSessionCreate {
  recordId: string;
  operation: RecordBatchOperation & { kind: 'create' };
}

export class TaskSessionMutation {
  constructor(
    private readonly dataStore: DataStore,
    private readonly repository: RecordRepository,
  ) {}

  async createSession(taskId: string, input: TaskSessionCreateInput): Promise<Item> {
    const task = await this.requireTask(taskId);
    const prepared = this.prepareCreateOperation(task, input);
    await this.repository.batch([prepared.operation]);
    const created = await this.repository.getById(prepared.recordId);
    if (!created || created.coreBlock !== 'task-session') {
      throw new Error(`task_session_create_scan_failed:${prepared.recordId}`);
    }
    return created;
  }

  async updateSessionTime(sessionId: string, updates: ItemTimeUpdates): Promise<Item> {
    const session = asTaskSessionRecord(await this.repository.getById(sessionId));
    if (!session) throw new Error(`task_session_required:${sessionId}`);

    let startedMs = Date.parse(session.sessionStartedAt);
    let endedMs = Date.parse(session.sessionEndedAt);
    const originalDuration = session.sessionDurationMinutes;

    if (updates.time) startedMs = withLocalClock(session.sessionStartedAt, updates.time);
    if (updates.endTime) {
      endedMs = withLocalClock(session.sessionEndedAt, updates.endTime);
      if (endedMs < startedMs) endedMs += 86_400_000;
    } else if (updates.duration != null || updates.time) {
      const duration = updates.duration != null ? updates.duration : originalDuration;
      if (!Number.isFinite(duration) || duration < 0) throw new Error('task_session_duration_invalid');
      endedMs = startedMs + duration * 60_000;
    }

    if (!Number.isFinite(startedMs) || !Number.isFinite(endedMs) || endedMs < startedMs) {
      throw new Error('task_session_time_order_invalid');
    }
    const durationMinutes = Math.round(((endedMs - startedMs) / 60_000) * 100) / 100;
    await this.repository.update(session.id, {
      sessionStartedAt: new Date(startedMs).toISOString(),
      sessionEndedAt: new Date(endedMs).toISOString(),
      sessionDurationMinutes: durationMinutes,
    });
    const updated = await this.repository.getById(session.id);
    if (!updated) throw new Error(`task_session_update_scan_failed:${session.id}`);
    return updated;
  }

  /**
   * Bind a newly persisted Energy snapshot to the nearest eligible finished Session.
   * Goal is intentionally not part of the match: Energy is a person-level state.
   */
  async linkEnergySnapshot(energyRecordId: string): Promise<Item | null> {
    const energy = this.dataStore.getRecordById(energyRecordId);
    const after = energy ? readEnergyItemSnapshot(energy) : null;
    const afterMs = energy ? energyOccurrenceMs(energy) : null;
    if (!energy || !after || afterMs == null) return null;

    const candidates = this.dataStore.queryRecords()
      .map((item) => asTaskSessionRecord(item))
      .filter((session): session is NonNullable<typeof session> => !!session)
      .filter((session) => !!session.startEnergyRecordId && !session.endEnergyRecordId)
      .map((session) => {
        const endedMs = Date.parse(session.sessionEndedAt);
        return { session, endedMs, gapMinutes: (afterMs - endedMs) / 60000 };
      })
      .filter(({ endedMs, gapMinutes }) => Number.isFinite(endedMs) && gapMinutes >= 0 && gapMinutes <= ENERGY_FEEDBACK_WINDOW_MINUTES)
      .sort((left, right) => left.gapMinutes - right.gapMinutes);

    const chosen = candidates[0]?.session;
    if (!chosen?.startEnergyRecordId) return null;
    const beforeItem = this.dataStore.getRecordById(chosen.startEnergyRecordId);
    const before = beforeItem ? readEnergyItemSnapshot(beforeItem) : null;
    if (!before) return null;

    const patch: Record<string, unknown> = {
      endEnergyRecordId: energyRecordId,
      energyDelta: after.score - before.score,
      brainDelta: before.brainScore != null && after.brainScore != null ? after.brainScore - before.brainScore : undefined,
      physicalDelta: before.physicalScore != null && after.physicalScore != null ? after.physicalScore - before.physicalScore : undefined,
    };
    await this.repository.update(chosen.id, patch);
    return this.dataStore.getRecordById(chosen.id);
  }

  prepareCreateOperation(task: Item, input: TaskSessionCreateInput, recordId = createRecordId('task-session')): PreparedTaskSessionCreate {
    if (!asTaskRecord(task)) throw new Error(`task_record_required:${task.id}`);
    const path = task.source?.path || task.file?.path || this.dataStore.getRecordLocation(task.id)?.path || '';
    if (!path) throw new Error(`record_location_unavailable:${task.id}`);
    return {
      recordId,
      operation: {
        kind: 'create',
        record: {
          recordId,
          coreBlock: 'task-session',
          targetFilePath: path,
          targetHeader: task.header || null,
          fields: buildTaskSessionFields(task, input),
        },
      },
    };
  }

  private async requireTask(taskId: string): Promise<Item> {
    const task = await this.repository.getById(taskId);
    if (!asTaskRecord(task)) throw new Error(`task_record_required:${taskId}`);
    return task!;
  }
}
