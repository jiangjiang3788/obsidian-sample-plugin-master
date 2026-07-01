import {
  buildRecordOutputPlan,
  buildRecordPersistencePlan,
  buildSuccessResult,
  buildValidationErrorResult,
  finalizeRecordSubmitResult,
} from '@core/recordInput/public';
import type { RecordSubmitResult, SubmitUpdateRecordParams } from '@core/recordInput/public';

import { mapSubmitError } from '../error';
import { getItemFilePath } from '../locator';
import { buildPlanConsistencyIssues } from '../planGuard';
import { buildRefreshPlan } from '../paths';
import { getTemplateExecutionMeta, prepareTemplateSubmit } from '../templateSubmit';
import { RecordMigrationTransaction } from './RecordMigrationTransaction';
import type { RecordInputWorkflowRuntime } from './types';

export class UpdateRecordWorkflow {
  constructor(private runtime: RecordInputWorkflowRuntime) {}

  async submit(params: SubmitUpdateRecordParams): Promise<RecordSubmitResult> {
    const prepared = prepareTemplateSubmit({
      kernel: this.runtime.getKernel(),
      operation: 'update',
      blockId: params.blockId,
      themeId: params.themeId ?? null,
      item: params.item,
      formData: params.formData,
      normalizeMode: 'edit',
      validateMode: 'edit',
    });
    if (!prepared.ok) return prepared.result;

    const { resolved, normalized, warnings } = prepared.submit;
    const templateMeta = getTemplateExecutionMeta(resolved, resolved.template);
    const outputPlan = buildRecordOutputPlan({
      template: resolved.template,
      formData: normalized.normalizedFormData,
      theme: resolved.theme ?? undefined,
      templateMeta,
    });
    const persistencePlan = buildRecordPersistencePlan({
      mode: 'edit',
      originalPath: getItemFilePath(params.item),
      outputPlan,
    });

    const planConsistencyIssues = buildPlanConsistencyIssues({
      expectedOutputPlan: params.expectedOutputPlan,
      expectedPersistencePlan: params.expectedPersistencePlan,
      actualOutputPlan: outputPlan,
      actualPersistencePlan: persistencePlan,
    });
    if (planConsistencyIssues.length > 0) {
      return buildValidationErrorResult('update', planConsistencyIssues, warnings);
    }

    try {
      if (persistencePlan.pathChanged && persistencePlan.writeMode === 'move_and_replace') {
        return await new RecordMigrationTransaction(this.runtime).execute({
          item: params.item,
          template: resolved.template,
          theme: resolved.theme,
          resolved,
          normalized,
          templateMeta,
          outputPlan,
          persistencePlan,
          warnings,
          signal: params.signal,
        });
      }

      const path = await this.runtime.deps.inputService.updateExistingRecord(
        params.item,
        resolved.template,
        normalized.normalizedFormData,
        resolved.theme ?? undefined,
        templateMeta,
        { signal: params.signal, autoRefresh: false },
      );
      return finalizeRecordSubmitResult(this.runtime.deps.dataStore, buildSuccessResult('update', {
        affectedPath: path,
        affectedRecordId: params.item.id,
        refresh: buildRefreshPlan([path]),
        feedback: { notice: '✅ 已保存修改' },
        warnings,
      }));
    } catch (error) {
      return finalizeRecordSubmitResult(this.runtime.deps.dataStore, mapSubmitError('update', error, warnings, {
        refreshPaths: [getItemFilePath(params.item)],
      }));
    }
  }
}
