import type { AppStoreApi } from './index';
import { DataStore, InputService, ItemService } from '@core/services/public';
import { RecordInputKernel } from '@core/recordInput/public';
import { buildSuccessResult, buildValidationErrorResult } from '@core/recordInput/public';
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
