import { buildSuccessResult } from '@core/recordInput/public';
import type { RecordSubmitResult, SubmitDeleteRecordParams } from '@core/recordInput/public';

import { getItemFilePath } from '../locator';
import { buildRefreshPlan } from '../paths';
import { submitFinalizedRecordMutation } from '../submitPipeline';
import type { RecordInputWorkflowRuntime } from './types';

export class DeleteRecordWorkflow {
  constructor(private runtime: RecordInputWorkflowRuntime) {}

  async submit(params: SubmitDeleteRecordParams): Promise<RecordSubmitResult> {
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
