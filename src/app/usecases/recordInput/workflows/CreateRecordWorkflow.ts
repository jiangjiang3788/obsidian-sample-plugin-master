import { applyRecordRefreshPlan, buildSuccessResult } from '@core/recordInput/public';
import type { RecordSubmitResult, SubmitCreateRecordParams } from '@core/recordInput/public';

import { mapSubmitError } from '../error';
import { buildRefreshPlan, getFileItemsByPath } from '../paths';
import { getTemplateExecutionMeta, prepareTemplateSubmit } from '../templateSubmit';
import { throwIfAborted } from '../submitPipeline';
import type { RecordInputWorkflowRuntime } from './types';

export class CreateRecordWorkflow {
  constructor(private runtime: RecordInputWorkflowRuntime) {}

  async submit(params: SubmitCreateRecordParams): Promise<RecordSubmitResult> {
    const prepared = prepareTemplateSubmit({
      kernel: this.runtime.getKernel(),
      operation: 'create',
      blockId: params.blockId,
      themeId: params.themeId ?? null,
      formData: params.formData,
      context: params.context,
      normalizeMode: params.source === 'ai_batch' ? 'ai_batch' : 'create',
      validateMode: 'create',
    });
    if (!prepared.ok) return prepared.result;

    const { resolved, normalized, warnings } = prepared.submit;

    try {
      throwIfAborted(params.signal);
      const templateMeta = getTemplateExecutionMeta(resolved, resolved.template);
      const preview = this.runtime.deps.inputService.previewTemplateExecution(
        resolved.template,
        normalized.normalizedFormData,
        resolved.theme ?? undefined,
        templateMeta,
      );
      if (!preview.recordId) throw new Error('record_id_required_before_create');
      const path = await this.runtime.deps.inputService.executeTemplate(
        resolved.template,
        normalized.normalizedFormData,
        resolved.theme ?? undefined,
        templateMeta,
        { signal: params.signal, recordId: preview.recordId || undefined },
      );

      const refreshPlan = buildRefreshPlan([path]);
      const scannedByPath = await applyRecordRefreshPlan(this.runtime.deps.dataStore, refreshPlan);
      const scannedItems = scannedByPath.get(path) ?? getFileItemsByPath(this.runtime.deps.dataStore, path);
      const createdRecord = scannedItems.find(item => item.id === preview.recordId);
      if (!createdRecord) throw new Error(`record_create_scan_failed:${preview.recordId}`);

      return buildSuccessResult('create', {
        affectedPath: path,
        affectedRecordId: createdRecord?.id,
        refresh: refreshPlan,
        feedback: { notice: '✅ 已创建' },
        followUp: createdRecord.coreBlock === 'task' ? { startTimerForRecordId: createdRecord.id } : undefined,
        warnings,
      });
    } catch (error) {
      return mapSubmitError('create', error, warnings);
    }
  }
}
