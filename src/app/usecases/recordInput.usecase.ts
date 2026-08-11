import type { AppStoreApi } from './index';
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
  SubmitUpdateRecordTimeParams,
} from '@core/recordInput/public';
import { buildRefreshPlan } from './recordInput/paths';
import { submitFinalizedRecordMutation } from './recordInput/submitPipeline';
import { normalizeTimeUpdates } from './recordInput/time';
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
      const linkedSession = await this.deps.itemService.linkEnergySnapshot(record.recordId);
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

  async submitUpdateRecordTime(params: SubmitUpdateRecordTimeParams): Promise<RecordSubmitResult> {
    const normalizedUpdates = normalizeTimeUpdates(params.updates);
    if ('error' in normalizedUpdates) {
      return buildValidationErrorResult('time_update', [normalizedUpdates.error]);
    }

    return submitFinalizedRecordMutation({
      dataStore: this.deps.dataStore,
      operation: 'time_update',
      signal: params.signal,
      refreshPathsOnError: () => [this.deps.dataStore.getRecordLocation(params.itemId)?.path || null],
      run: async () => {
        const path = this.deps.dataStore.getRecordLocation(params.itemId)?.path;
        if (!path) throw new Error(`record_location_unavailable:${params.itemId}`);
        await this.deps.itemService.updateItemTime(params.itemId, normalizedUpdates, { autoRefresh: false });
        return buildSuccessResult('time_update', {
          affectedPath: path,
          affectedRecordId: params.itemId,
          refresh: buildRefreshPlan([path]),
          feedback: {
            notice: normalizedUpdates.duration != null
              ? `工作 Session 时长已更新为 ${normalizedUpdates.duration} 分钟。`
              : '工作 Session 时间已更新。',
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
