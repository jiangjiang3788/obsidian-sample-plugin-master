import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { DataStore } from '../DataStore';
import { RecordRepository, type RecordBatchOperation } from '@/core/records/RecordRepository';
import { createRecordId } from '@/core/records/RecordId';
import { asTaskRecord, type TaskRecord } from '@/core/records/task/taskDomain';
import { asTaskSessionRecord, buildTaskSessionFields, type TaskSessionCreateInput } from '@/core/records/task/taskSession';
import { readEnergyItemSnapshot } from '@/core/energy/item';
import type { TimelineLogicalRange } from '@/core/types/timeline';



const ENERGY_FEEDBACK_WINDOW_MINUTES = 120;

function energyOccurrenceMs(item: RecordViewItem): number | null {
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

  async createSession(taskId: string, input: TaskSessionCreateInput): Promise<RecordViewItem> {
    const task = await this.requireTask(taskId);
    const prepared = this.prepareCreateOperation(task, input);
    await this.repository.batch([prepared.operation]);
    const created = await this.repository.getById(prepared.recordId);
    if (!created || created.recordType !== 'task-session') {
      throw new Error(`task_session_create_scan_failed:${prepared.recordId}`);
    }
    return created;
  }

  /**
   * Update one TaskSession from a complete logical range.
   *
   * The public domain capability keeps the stable `updateSessionTime` name required by
   * TaskSession consumers, while callers pass start/end as the single source of truth.
   */
  async updateSessionTime(sessionId: string, range: TimelineLogicalRange): Promise<RecordViewItem> {
    const session = asTaskSessionRecord(await this.repository.getById(sessionId));
    if (!session) throw new Error(`task_session_required:${sessionId}`);
    if (!range.end) throw new Error('task_session_range_end_required');

    const startedMs = Date.parse(range.start);
    const endedMs = Date.parse(range.end);
    if (!Number.isFinite(startedMs) || !Number.isFinite(endedMs) || endedMs <= startedMs) {
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
  async linkEnergySnapshot(energyRecordId: string): Promise<RecordViewItem | null> {
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

  prepareCreateOperation(task: RecordViewItem, input: TaskSessionCreateInput, recordId = createRecordId('task-session')): PreparedTaskSessionCreate {
    const taskRecord = asTaskRecord(task);
    if (!taskRecord) throw new Error(`task_record_required:${task.id}`);
    const path = taskRecord.source?.path || taskRecord.file?.path || this.dataStore.getRecordLocation(taskRecord.id)?.path || '';
    if (!path) throw new Error(`record_location_unavailable:${task.id}`);
    return {
      recordId,
      operation: {
        kind: 'create',
        record: {
          recordId,
          recordType: 'task-session',
          targetFilePath: path,
          targetHeader: taskRecord.header || null,
          fields: buildTaskSessionFields(taskRecord, input),
        },
      },
    };
  }

  private async requireTask(taskId: string): Promise<TaskRecord> {
    const task = asTaskRecord(await this.repository.getById(taskId));
    if (!task) throw new Error(`task_record_required:${taskId}`);
    return task;
  }
}
