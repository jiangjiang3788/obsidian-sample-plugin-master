import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { DataStore } from '../DataStore';
import { RecordRepository, type RecordBatchOperation } from '@/core/records/RecordRepository';
import { createRecordId } from '@/core/records/RecordId';
import { asTaskRecord, asTaskSeriesRecord, type TaskDemandLevel, type TaskPriority, type TaskRecord, type TaskSeriesRecord } from '@/core/records/task/taskDomain';
import { canTransitionTaskStatus, getTaskStatus, nextTaskStatus, type TaskLifecycleCommand } from '@/core/records/task/taskStatus';
import { buildNextOccurrenceDates, normalizeRecurrenceInfo, type RecurrenceInfo } from '@/core/records/task/taskRecurrence';
import type { TaskSessionCreateInput } from '@/core/types/timer';
import { TaskSessionMutation } from './TaskSessionMutation';
import type { ItemMutationOptions } from './types';

function timestampNow(): string { return new Date().toISOString(); }

export interface TaskSeriesUpdate {
  recurrence?: Partial<RecurrenceInfo>;
  content?: string;
  goalId?: string | null;
  goalPath?: string | null;
  themePath?: string | null;
  priority?: TaskPriority | null;
  expectedDurationMinutes?: number | null;
  energyDemand?: TaskDemandLevel | null;
  brainDemand?: TaskDemandLevel | null;
  physicalDemand?: TaskDemandLevel | null;
  availabilityContexts?: TaskSeriesRecord['availabilityContexts'] | null;
  recoveryIntent?: boolean | null;
}


function sourcePath(dataStore: DataStore, item: TaskRecord): string {
  return item.source?.path || item.file?.path || dataStore.getRecordLocation(item.id)?.path || '';
}

function nextTaskFields(task: TaskRecord, series: TaskSeriesRecord, completedAt: string, nextDates: ReturnType<typeof buildNextOccurrenceDates>): Record<string, unknown> {
  return {
    status: 'open',
    // Series owns future-instance defaults. Historical/current Task metadata is never used
    // as the authority for future occurrences after a Series update.
    content: series.content || task.content,
    goalId: series.goalId,
    goalPath: series.goalPath,
    themePath: series.themePath || series.theme,
    createdAt: completedAt,
    priority: series.priority,
    expectedDurationMinutes: series.expectedDurationMinutes,
    energyDemand: series.energyDemand,
    brainDemand: series.brainDemand,
    physicalDemand: series.physicalDemand,
    availabilityContexts: series.availabilityContexts,
    recoveryIntent: series.recoveryIntent,
    scheduledAt: nextDates.scheduledAt,
    startAt: nextDates.startAt,
    dueAt: nextDates.dueAt,
    scheduledDate: nextDates.scheduledDate,
    startDate: nextDates.startDate,
    dueDate: nextDates.dueDate,
    seriesId: series.id,
    templateId: task.templateId,
    templateSourceType: task.templateSourceType,
  };
}

export class TaskCompletionMutation {
  private readonly taskSessions: TaskSessionMutation;

  constructor(
    private readonly dataStore: DataStore,
    private readonly repository: RecordRepository,
    taskSessions?: TaskSessionMutation,
  ) {
    this.taskSessions = taskSessions ?? new TaskSessionMutation(dataStore, repository);
  }

  async completeItem(itemId: string, _mutationOptions: ItemMutationOptions = {}): Promise<void> {
    await this.transition(itemId, 'complete');
  }

  async completeItemWithSession(
    itemId: string,
    session: TaskSessionCreateInput,
    _mutationOptions: ItemMutationOptions = {},
  ): Promise<void> {
    if (session.result !== 'task-completed') throw new Error('task_session_complete_result_required');
    await this.transition(itemId, 'complete', session);
  }

  async cancelItem(itemId: string): Promise<void> { await this.transition(itemId, 'cancel'); }
  async skipItem(itemId: string): Promise<void> { await this.transition(itemId, 'skip'); }
  async reopenItem(itemId: string): Promise<void> { await this.transition(itemId, 'reopen'); }

  async updateSeries(
    seriesId: string,
    update: TaskSeriesUpdate,
    options: { includeCurrent?: boolean } = {},
  ): Promise<void> {
    const series = asTaskSeriesRecord(await this.repository.getById(seriesId));
    if (!series) throw new Error(`task_series_invalid:${seriesId}`);

    const seriesPatch: Record<string, unknown> = {};
    if (Object.prototype.hasOwnProperty.call(update, 'content') && !String(update.content || '').trim()) {
      throw new Error(`task_series_content_required:${seriesId}`);
    }
    if (update.recurrence) {
      const recurrence = normalizeRecurrenceInfo({
        ...series.recurrenceInfo,
        ...update.recurrence,
      });
      if (!recurrence) throw new Error(`task_series_recurrence_invalid:${seriesId}`);
      seriesPatch.recurrenceUnit = recurrence.unit;
      seriesPatch.recurrenceInterval = recurrence.interval;
      seriesPatch.recurrenceAnchor = recurrence.anchor;
    }

    const sharedFields: Array<[keyof TaskSeriesUpdate, string]> = [
      ['content', 'content'],
      ['goalId', 'goalId'],
      ['goalPath', 'goalPath'],
      ['themePath', 'themePath'],
      ['priority', 'priority'],
      ['expectedDurationMinutes', 'expectedDurationMinutes'],
      ['energyDemand', 'energyDemand'],
      ['brainDemand', 'brainDemand'],
      ['physicalDemand', 'physicalDemand'],
      ['availabilityContexts', 'availabilityContexts'],
      ['recoveryIntent', 'recoveryIntent'],
    ];
    for (const [sourceKey, patchKey] of sharedFields) {
      if (Object.prototype.hasOwnProperty.call(update, sourceKey)) seriesPatch[patchKey] = update[sourceKey];
    }

    const operations: RecordBatchOperation[] = [];
    if (Object.keys(seriesPatch).length) operations.push({ kind: 'update', recordId: series.id, patch: seriesPatch });

    if (options.includeCurrent && series.currentTaskId) {
      const current = asTaskRecord(await this.repository.getById(series.currentTaskId));
      if (!current || current.seriesId !== series.id) throw new Error(`task_series_current_conflict:${series.id}`);
      if (getTaskStatus(current) !== 'open') throw new Error(`task_series_current_not_open:${series.id}`);
      const currentPatch: Record<string, unknown> = {};
      for (const [sourceKey, patchKey] of sharedFields) {
        if (Object.prototype.hasOwnProperty.call(update, sourceKey)) currentPatch[patchKey] = update[sourceKey];
      }
      if (Object.keys(currentPatch).length) operations.push({ kind: 'update', recordId: current.id, patch: currentPatch });
    }

    if (operations.length) await this.repository.batch(operations);
  }

  async repairSeriesCurrentTask(seriesId: string): Promise<'already-valid' | 'repaired'> {
    const series = asTaskSeriesRecord(await this.repository.getById(seriesId));
    if (!series) throw new Error(`task_series_invalid:${seriesId}`);
    if (series.status !== 'active') throw new Error(`task_series_repair_requires_active:${seriesId}`);

    const pointed = series.currentTaskId ? asTaskRecord(await this.repository.getById(series.currentTaskId)) : null;
    if (pointed && pointed.seriesId === series.id && getTaskStatus(pointed) === 'open') return 'already-valid';

    const candidates = this.dataStore.queryRecords()
      .filter(item => item.coreBlock === 'task' && item.seriesId === series.id && getTaskStatus(item) === 'open');
    if (candidates.length !== 1) {
      throw new Error(`task_series_repair_ambiguous:${seriesId}:${candidates.length}`);
    }
    await this.repository.update(series.id, { currentTaskId: candidates[0].id });
    return 'repaired';
  }

  async stopSeries(seriesId: string, options: { cancelCurrent?: boolean } = {}): Promise<void> {
    const series = asTaskSeriesRecord(await this.repository.getById(seriesId));
    if (!series) throw new Error(`task_series_invalid:${seriesId}`);
    if (series.status !== 'active') return;
    const operations: RecordBatchOperation[] = [{ kind: 'update', recordId: series.id, patch: { status: 'stopped' } }];
    if (options.cancelCurrent && series.currentTaskId) {
      const current = asTaskRecord(await this.repository.getById(series.currentTaskId));
      if (current && getTaskStatus(current) === 'open') {
        operations.push({ kind: 'update', recordId: current.id, patch: { status: 'cancelled', cancelledAt: timestampNow() } });
      }
    }
    await this.repository.batch(operations);
  }

  private async transition(
    itemId: string,
    command: TaskLifecycleCommand,
    sessionInput?: TaskSessionCreateInput,
  ): Promise<void> {
    const task = await this.requireTask(itemId);
    const status = getTaskStatus(task);
    if (!status) throw new Error(`task_status_invalid:${itemId}`);
    const recurring = Boolean(task.seriesId);
    if (!canTransitionTaskStatus(status, command, { recurring })) {
      throw new Error(`task_transition_invalid:${status}:${command}`);
    }

    const at = timestampNow();
    if (command === 'reopen') {
      if (task.seriesId) {
        const series = asTaskSeriesRecord(await this.repository.getById(task.seriesId));
        if (!series || series.currentTaskId !== task.id) throw new Error('task_reopen_recurring_conflict');
      }
      await this.repository.update(task.id, { status: 'open', completedAt: null, cancelledAt: null, skippedAt: null });
      return;
    }

    const patch: Record<string, unknown> = { status: nextTaskStatus(command) };
    const sessionOperation = sessionInput
      ? this.taskSessions.prepareCreateOperation(task, sessionInput).operation
      : null;
    if (command === 'complete') patch.completedAt = at;
    if (command === 'cancel') patch.cancelledAt = at;
    if (command === 'skip') patch.skippedAt = at;
    if (!task.seriesId || command === 'cancel') {
      if (sessionOperation) await this.repository.batch([{ kind: 'update', recordId: task.id, patch }, sessionOperation]);
      else await this.repository.update(task.id, patch);
      return;
    }

    const series = asTaskSeriesRecord(await this.repository.getById(task.seriesId));
    if (!series) throw new Error(`task_series_missing:${task.seriesId}`);
    if (series.currentTaskId !== task.id) throw new Error(`task_series_current_conflict:${series.id}`);
    if (series.status === 'stopped') {
      // Stopping recurrence does not have to cancel the current occurrence. It can still
      // be completed/skipped, but it must never generate another instance.
      if (sessionOperation) await this.repository.batch([{ kind: 'update', recordId: task.id, patch }, sessionOperation]);
      else await this.repository.update(task.id, patch);
      return;
    }
    const recurrence = normalizeRecurrenceInfo(series.recurrenceInfo);
    if (!recurrence) throw new Error(`task_series_recurrence_invalid:${series.id}`);

    const nextId = createRecordId('task');
    const nextDates = buildNextOccurrenceDates(task, recurrence, at);
    const path = sourcePath(this.dataStore, task);
    if (!path) throw new Error(`record_location_unavailable:${task.id}`);

    const operations: RecordBatchOperation[] = [
      { kind: 'update', recordId: task.id, patch },
    ];
    if (sessionOperation) operations.push(sessionOperation);
    operations.push(
      { kind: 'create', record: {
        recordId: nextId,
        coreBlock: 'task',
        targetFilePath: path,
        targetHeader: task.header || null,
        fields: nextTaskFields(task, series, at, nextDates),
      } },
      { kind: 'update', recordId: series.id, patch: { currentTaskId: nextId } },
    );
    await this.repository.batch(operations);
  }

  private async requireTask(itemId: string): Promise<TaskRecord> {
    const task = asTaskRecord(await this.repository.getById(itemId));
    if (!task) throw new Error(`task_record_required:${itemId}`);
    return task;
  }
}
