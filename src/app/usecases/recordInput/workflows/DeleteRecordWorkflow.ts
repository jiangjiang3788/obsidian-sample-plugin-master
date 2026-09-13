import { buildSuccessResult, buildValidationErrorResult } from '@core/recordInput/public';
import type { RecordSubmitResult, SubmitDeleteRecordParams } from '@core/recordInput/public';

import { getItemFilePath } from '../locator';
import { buildRefreshPlan } from '../paths';
import { submitFinalizedRecordMutation } from '../submitPipeline';
import type { RecordInputWorkflowRuntime } from './types';

export class DeleteRecordWorkflow {
  constructor(private runtime: RecordInputWorkflowRuntime) {}

  async submit(params: SubmitDeleteRecordParams): Promise<RecordSubmitResult> {
    if (params.item.recordType === 'task' && String(params.item.seriesId || '').trim()) {
      return buildValidationErrorResult('delete', [{
        code: 'recurring_task_delete_requires_lifecycle_command',
        message: '周期任务当前实例不能直接删除，请使用“跳过本次”或“停止重复”。',
      }]);
    }
    return submitFinalizedRecordMutation({
      dataStore: this.runtime.deps.dataStore,
      operation: 'delete',
      signal: params.signal,
      refreshPathsOnError: [getItemFilePath(params.item)],
      run: async () => {
        const path = await this.runtime.deps.inputService.deleteExistingRecord(params.item, {
          signal: params.signal,
          autoRefresh: false,
        });
        return buildSuccessResult('delete', {
          affectedPath: path,
          affectedRecordId: params.item.id,
          refresh: buildRefreshPlan([path]),
          feedback: { notice: '✅ 已删除记录' },
        });
      },
    });
  }
}
