import type { AppStoreApi } from './AppStoreApi';
import type { EisenhowerQuadrant, TaskLifecycleCommand } from '@core/records/public';
import { DataStore, InputService, ItemService } from '@core/services/public';
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
  SubmitTaskSessionParams,
  SubmitUpdateRecordParams,
  SubmitUpdateTimelineRangeParams,
} from '@core/recordInput/public';
import { buildRefreshPlan } from './recordInput/paths';
import { submitFinalizedRecordMutation } from './recordInput/submitPipeline';
import { normalizeTimelineRangeUpdate } from './recordInput/timelineRange';
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

  async submitEnergySnapshot(params: EnergySnapshotInput & { signal?: AbortSignal; linkFinishedSession?: boolean }): Promise<RecordSubmitResult> {
    const record = buildEnergySnapshotRecord(params);
    if (!record.goalPath) {
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
      const linkedSession = params.linkFinishedSession === false
        ? null
        : await this.deps.itemService.linkEnergySnapshot(record.recordId);
      return buildSuccessResult('create', {
        affectedPath: path,
        affectedRecordId: record.recordId,
        refresh,
        feedback: { notice: linkedSession ? `已记录精力 ${record.score}，并关联本次工作反馈。` : `已记录精力 ${record.score}` },
      });
    } catch (error) {
      return mapSubmitError('create', error);
    }
  }

  async submitUpdateRecord(params: SubmitUpdateRecordParams): Promise<RecordSubmitResult> {
    return new UpdateRecordWorkflow(this.getWorkflowRuntime()).submit(params);
  }

  async updateTaskQuadrant(itemId: string, quadrant: EisenhowerQuadrant): Promise<void> {
    await this.deps.itemService.updateTaskQuadrant(itemId, quadrant);
  }

  async stopTaskSeries(seriesId: string): Promise<void> {
    await this.deps.itemService.stopTaskSeries(seriesId, { cancelCurrent: false });
  }

  async submitTaskLifecycle(
    itemId: string,
    command: Exclude<TaskLifecycleCommand, 'complete'>,
    session?: SubmitCompleteRecordParams['session'],
  ): Promise<RecordSubmitResult> {
    return submitFinalizedRecordMutation({
      dataStore: this.deps.dataStore,
      operation: 'update',
      refreshPathsOnError: () => [this.deps.dataStore.getRecordLocation(itemId)?.path || null],
      run: async () => {
        const path = this.deps.dataStore.getRecordLocation(itemId)?.path;
        if (!path) throw new Error(`record_location_unavailable:${itemId}`);
        if (command === 'cancel') {
          if (session) await this.deps.itemService.cancelItemWithSession(itemId, session);
          else await this.deps.itemService.cancelItem(itemId);
        } else if (command === 'reopen') await this.deps.itemService.reopenItem(itemId);
        else if (command === 'skip') {
          if (session) await this.deps.itemService.skipItemWithSession(itemId, session);
          else await this.deps.itemService.skipItem(itemId);
        }
        else throw new Error(`task_lifecycle_command_invalid:${command}`);
        const notice = command === 'cancel' ? '任务已取消。' : command === 'reopen' ? '任务已重新打开。' : '已跳过本次任务。';
        return buildSuccessResult('update', {
          affectedPath: path,
          affectedRecordId: itemId,
          refresh: buildRefreshPlan([path]),
          feedback: { notice },
        });
      },
    });
  }

  async submitDeleteRecord(params: SubmitDeleteRecordParams): Promise<RecordSubmitResult> {
    return new DeleteRecordWorkflow(this.getWorkflowRuntime()).submit(params);
  }

  async submitCompleteRecord(params: SubmitCompleteRecordParams): Promise<RecordSubmitResult> {
    return submitFinalizedRecordMutation({
      dataStore: this.deps.dataStore,
      operation: 'complete',
      signal: params.signal,
      refreshPathsOnError: () => [this.deps.dataStore.getRecordLocation(params.itemId)?.path || null],
      run: async () => {
        const path = this.deps.dataStore.getRecordLocation(params.itemId)?.path;
        if (!path) throw new Error(`record_location_unavailable:${params.itemId}`);
        if (params.session) {
          await this.deps.itemService.completeItemWithSession(params.itemId, params.session, { autoRefresh: false });
        } else {
          await this.deps.itemService.completeItem(params.itemId, { autoRefresh: false });
        }
        return buildSuccessResult('complete', {
          affectedPath: path,
          affectedRecordId: params.itemId,
          refresh: buildRefreshPlan([path]),
          feedback: { notice: params.session ? `任务已完成，本次工作已保存为 Session。` : '任务已完成。' },
        });
      },
    });
  }

  async submitTaskSession(params: SubmitTaskSessionParams): Promise<RecordSubmitResult> {
    return submitFinalizedRecordMutation({
      dataStore: this.deps.dataStore,
      operation: 'task_session',
      signal: params.signal,
      refreshPathsOnError: () => [this.deps.dataStore.getRecordLocation(params.itemId)?.path || null],
      run: async () => {
        const path = this.deps.dataStore.getRecordLocation(params.itemId)?.path;
        if (!path) throw new Error(`record_location_unavailable:${params.itemId}`);
        const session = await this.deps.itemService.createTaskSession(params.itemId, params.session);
        return buildSuccessResult('task_session', {
          affectedPath: path,
          affectedRecordId: session.id,
          refresh: buildRefreshPlan([path]),
          feedback: { notice: '本次工作已保存。' },
        });
      },
    });
  }

  async submitUpdateTimelineRange(params: SubmitUpdateTimelineRangeParams): Promise<RecordSubmitResult> {
    const normalizedRange = normalizeTimelineRangeUpdate(params);
    if ('error' in normalizedRange) {
      return buildValidationErrorResult('time_update', [normalizedRange.error]);
    }

    return submitFinalizedRecordMutation({
      dataStore: this.deps.dataStore,
      operation: 'time_update',
      signal: params.signal,
      refreshPathsOnError: () => [this.deps.dataStore.getRecordLocation(params.target.recordId)?.path || null],
      run: async () => {
        const path = this.deps.dataStore.getRecordLocation(params.target.recordId)?.path;
        if (!path) throw new Error(`record_location_unavailable:${params.target.recordId}`);
        await this.deps.itemService.updateTimelineRange(params.target, normalizedRange, { autoRefresh: false });
        const durationMinutes = normalizedRange.end
          ? Math.round(((Date.parse(normalizedRange.end) - Date.parse(normalizedRange.start)) / 60_000) * 100) / 100
          : null;
        return buildSuccessResult('time_update', {
          affectedPath: path,
          affectedRecordId: params.target.recordId,
          refresh: buildRefreshPlan([path]),
          feedback: {
            notice: durationMinutes != null
              ? `时间轴区间已更新为 ${durationMinutes} 分钟。`
              : '时间轴时间点已更新。',
          },
        });
      },
    });
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
