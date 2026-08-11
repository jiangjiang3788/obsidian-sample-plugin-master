import type { AppStoreApi } from './index';
import { DataStore, InputService, ItemService, TimerStateService } from '@core/services/public';
import { RecordInputKernel } from '@core/recordInput/public';
import { applyRecordRefreshPlan, buildSuccessResult, buildValidationErrorResult } from '@core/recordInput/public';
import {
  ENERGY_APPEND_UNDER_HEADER,
  ENERGY_TARGET_FILE,
  buildEnergySnapshotMarkdown,
  buildEnergySnapshotRecord,
  type EnergySnapshotInput,
} from '@core/energy/public';
import type {
  PrepareCreateRecordParams,
  PrepareEditRecordParams,
  PreparedCreateRecord,
  PreparedEditRecord,
  RecordSubmitResult,
  SubmitCompleteRecordParams,
  SubmitCreateRecordParams,
  SubmitDeleteRecordParams,
  SubmitUpdateRecordParams,
  SubmitUpdateRecordTimeParams,
} from '@core/recordInput/public';
import { parseItemLocator } from './recordInput/locator';
import { buildRefreshPlan, tryParseItemPath } from './recordInput/paths';
import { submitFinalizedRecordMutation } from './recordInput/submitPipeline';
import { normalizeCompletionOptions, normalizeTimeUpdates } from './recordInput/time';
import { mapSubmitError } from './recordInput/error';
import {
  CreateRecordWorkflow,
  DeleteRecordWorkflow,
  UpdateRecordWorkflow,
  createRecordInputWorkflowRuntime,
} from './recordInput/workflows';

export interface RecordInputUseCaseDeps {
  inputService: InputService;
  itemService: ItemService;
  dataStore: DataStore;
  timerStateService: TimerStateService;
}

export class RecordInputUseCase {
  constructor(
    private store: AppStoreApi,
    private deps: RecordInputUseCaseDeps,
  ) {}

  prepareCreateRecord(params: PrepareCreateRecordParams): PreparedCreateRecord {
    return this.getKernel().prepareCreate(params);
  }

  prepareEditRecord(params: PrepareEditRecordParams): PreparedEditRecord {
    return this.getKernel().prepareEdit(params);
  }

  async submitCreateRecord(params: SubmitCreateRecordParams): Promise<RecordSubmitResult> {
    return new CreateRecordWorkflow(this.getWorkflowRuntime()).submit(params);
  }

  async submitEnergySnapshot(params: EnergySnapshotInput & { signal?: AbortSignal }): Promise<RecordSubmitResult> {
    const record = buildEnergySnapshotRecord(params);
    if (!record.goalId || !record.goalPath) {
      return buildValidationErrorResult('create', [{
        code: 'energy_goal_required',
        field: '目标',
        message: '精力记录必须绑定目标。',
      }]);
    }
    if (record.captureMode === 'retrospective' && (!record.date || !record.time || !record.recordedAt)) {
      return buildValidationErrorResult('create', [{
        code: 'energy_retrospective_exact_time_required',
        field: '时间',
        message: '补录精力必须提供实际发生日期、具体时间和记录时间。',
      }]);
    }
    if (record.captureMode === 'retrospective' && `${record.date} ${record.time}` > record.recordedAt!) {
      return buildValidationErrorResult('create', [{
        code: 'energy_retrospective_future_time',
        field: '时间',
        message: '补录发生时间不能晚于当前记录时间。',
      }]);
    }

    const header = ENERGY_APPEND_UNDER_HEADER.replace('{{goalPath}}', record.goalPath);
    const markdown = buildEnergySnapshotMarkdown(record);
    try {
      const path = await this.deps.inputService.appendDirectRecord(
        ENERGY_TARGET_FILE,
        markdown,
        header,
        { signal: params.signal },
      );
      const refresh = buildRefreshPlan([path]);
      await applyRecordRefreshPlan(this.deps.dataStore, refresh);
      const energyFeedback = await this.attachEnergyTaskFeedback(record);
      return buildSuccessResult('create', {
        affectedPath: path,
        refresh,
        feedback: { notice: energyFeedback
          ? `已记录精力 ${record.score} · 任务反馈 ${energyFeedback.delta > 0 ? '+' : ''}${energyFeedback.delta}`
          : `已记录精力 ${record.score}` },
      });
    } catch (error) {
      return mapSubmitError('create', error);
    }
  }

  async submitUpdateRecord(params: SubmitUpdateRecordParams): Promise<RecordSubmitResult> {
    return new UpdateRecordWorkflow(this.getWorkflowRuntime()).submit(params);
  }

  async submitDeleteRecord(params: SubmitDeleteRecordParams): Promise<RecordSubmitResult> {
    return new DeleteRecordWorkflow(this.getWorkflowRuntime()).submit(params);
  }

  async submitCompleteRecord(params: SubmitCompleteRecordParams): Promise<RecordSubmitResult> {
    return submitFinalizedRecordMutation({
      dataStore: this.deps.dataStore,
      operation: 'complete',
      signal: params.signal,
      refreshPathsOnError: () => [tryParseItemPath(params.itemId)],
      run: async () => {
        const path = parseItemLocator(params.itemId).path;
        const options = normalizeCompletionOptions(params.options);
        await this.deps.itemService.completeItem(params.itemId, options, { autoRefresh: false });
        return buildSuccessResult('complete', {
          affectedPath: path,
          affectedRecordId: params.itemId,
          refresh: buildRefreshPlan([path]),
          feedback: {
            notice: options?.duration != null
              ? `任务已完成，时长 ${options.duration} 分钟已记录。`
              : '任务已完成。',
          },
        });
      },
    });
  }

  async submitUpdateRecordTime(params: SubmitUpdateRecordTimeParams): Promise<RecordSubmitResult> {
    const normalizedUpdates = normalizeTimeUpdates(params.updates);
    if ('error' in normalizedUpdates) {
      return buildValidationErrorResult('time_update', [normalizedUpdates.error]);
    }

    return submitFinalizedRecordMutation({
      dataStore: this.deps.dataStore,
      operation: 'time_update',
      signal: params.signal,
      refreshPathsOnError: () => [tryParseItemPath(params.itemId)],
      run: async () => {
        const path = parseItemLocator(params.itemId).path;
        await this.deps.itemService.updateItemTime(params.itemId, normalizedUpdates, { autoRefresh: false });
        return buildSuccessResult('time_update', {
          affectedPath: path,
          affectedRecordId: params.itemId,
          refresh: buildRefreshPlan([path]),
          feedback: {
            notice: normalizedUpdates.duration != null
              ? `任务时长已更新为 ${normalizedUpdates.duration} 分钟。`
              : '任务时间已更新。',
          },
        });
      },
    });
  }


  /**
   * Conservative 1.0.28 feedback binding:
   * - only Energy-started work blocks that already stopped are eligible;
   * - only the nearest completed work block within 120 minutes;
   * - one Energy snapshot binds to at most one Energy-started work block.
   * This follows the Energy rule: prefer no association over a weak association.
   */
  private async attachEnergyTaskFeedback(record: ReturnType<typeof buildEnergySnapshotRecord>): Promise<{ delta: number; taskId: string } | null> {
    const sampleAt = Date.parse(`${record.date}T${record.time}:00`);
    if (!Number.isFinite(sampleAt)) return null;

    const entries = this.store.getState().timer.timers;
    const eligible = entries
      .filter((entry) => entry.status === 'awaiting-energy' && entry.energyContext && entry.completedAt)
      .map((entry) => {
        const completedAt = Number(entry.completedAt);
        const sameMinute = Math.floor(sampleAt / 60000) === Math.floor(completedAt / 60000);
        return { entry, gapMs: sameMinute ? 0 : sampleAt - completedAt };
      })
      .filter(({ gapMs }) => gapMs >= 0 && gapMs <= 120 * 60 * 1000)
      .sort((left, right) => left.gapMs - right.gapMs);

    const match = eligible[0];
    if (!match) return null;

    const baseline = Number(match.entry.energyContext!.baselineScore);
    const updated = {
      ...match.entry,
      status: 'feedback-recorded' as const,
      energyFeedback: {
        score: record.score,
        brainScore: record.brainScore,
        physicalScore: record.physicalScore,
        delta: Math.round((record.score - baseline) * 10) / 10,
        delayMinutes: Math.max(0, Math.round(match.gapMs / 60000)),
        capturedAt: sampleAt,
        date: record.date,
        time: record.time,
      },
    };
    this.store.getState().timer.timerUpdate(updated);

    // Keep a bounded local history. It is evidence/provenance, not a second task database.
    const afterUpdate = this.store.getState().timer.timers;
    const completedHistory = afterUpdate
      .filter((entry) => entry.status === 'feedback-recorded')
      .sort((a, b) => Number(b.energyFeedback?.capturedAt || 0) - Number(a.energyFeedback?.capturedAt || 0));
    for (const stale of completedHistory.slice(100)) {
      this.store.getState().timer.timerRemove(stale.id);
    }
    await this.deps.timerStateService.saveStateToFile(this.store.getState().timer.timers);
    return { delta: updated.energyFeedback.delta, taskId: updated.taskId };
  }

  private getWorkflowRuntime() {
    return createRecordInputWorkflowRuntime(this.deps, {
      getKernel: () => this.getKernel(),
    });
  }

  private getKernel(): RecordInputKernel {
    return new RecordInputKernel(this.store.getState().settings);
  }
}

export function createRecordInputUseCase(store: AppStoreApi, deps: RecordInputUseCaseDeps): RecordInputUseCase {
  return new RecordInputUseCase(store, deps);
}
