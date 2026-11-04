import { applyRecordRefreshPlan, buildSuccessResult } from '@core/recordInput/public';
import type { RecordSubmitResult, SubmitCreateRecordParams } from '@core/recordInput/public';

import { mapSubmitError } from '../error';
import { buildRefreshPlan, getFileItemsByPath } from '../paths';
import { prepareTemplateSubmit } from '../templateSubmit';
import { throwIfAborted } from '../submitPipeline';
import type { RecordInputWorkflowRuntime } from './types';


export function buildCreateRecordFollowUp(createdRecord: { id: string; recordType?: string; status?: string }): { startTimerForRecordId: string } | undefined {
  return createdRecord.recordType === 'task' && createdRecord.status === 'open'
    ? { startTimerForRecordId: createdRecord.id }
    : undefined;
}

export class CreateRecordWorkflow {
  constructor(private runtime: RecordInputWorkflowRuntime) {}

  async submit(params: SubmitCreateRecordParams): Promise<RecordSubmitResult> {
    let warnings: RecordSubmitResult['warnings'] = [];

    try {
      // Keep the entire submit boundary result-based. Preparation can execute
      // field behavior, dependency resolution and template normalization, all
      // of which may throw for malformed/legacy AI values. UI callers should
      // always receive a RecordSubmitResult instead of an unhandled rejection.
      const prepared = prepareTemplateSubmit({
        kernel: this.runtime.getKernel(),
        operation: 'create',
        recordTypeId: params.recordTypeId,
        formData: params.formData,
        context: params.context,
        normalizeMode: params.source === 'ai_batch' ? 'ai_batch' : 'create',
        validateMode: 'create',
      });
      if (!prepared.ok) return prepared.result;

      const { resolved, normalized } = prepared.submit;
      warnings = prepared.submit.warnings;
      throwIfAborted(params.signal);
      const preview = this.runtime.deps.inputService.previewTemplateExecution(
        resolved.template,
        normalized.normalizedFormData,
        undefined,
        params.context,
      );
      if (!preview.recordId) throw new Error('record_id_required_before_create');
      const path = await this.runtime.deps.inputService.executeTemplate(
        resolved.template,
        normalized.normalizedFormData,
        { signal: params.signal, recordId: preview.recordId || undefined, context: params.context },
      );

      const refreshPlan = buildRefreshPlan([path]);
      let createdRecord;
      try {
        const scannedByPath = await applyRecordRefreshPlan(this.runtime.deps.dataStore, refreshPlan);
        const scannedItems = scannedByPath.get(path) ?? getFileItemsByPath(this.runtime.deps.dataStore, path);
        createdRecord = scannedItems.find(item => item.id === preview.recordId);
      } catch {
        // A completed file write must not be reclassified as a failed create just
        // because the index or Obsidian's TFile cache is not ready yet.
      }
      if (!createdRecord) {
        let written: boolean | null = null;
        try { written = await this.runtime.deps.inputService.isRecordWritten(path, preview.recordId); }
        catch { /* A failed verification is NOT proof that the completed write was rolled back. */ }
        if (written !== false) {
          const confirmed = written === true;
          return buildSuccessResult('create', {
            status: 'partial_success',
            affectedPath: path,
            affectedRecordId: preview.recordId,
            refresh: refreshPlan,
            feedback: { notice: confirmed
              ? '记录已写入 Markdown，但索引尚未完成。请重新扫描笔记库，勿再次保存。'
              : 'Markdown 写入已返回成功，但无法核对落盘状态。请先检查原文件，勿重复提交。' },
            warnings: [...warnings, {
              code: confirmed ? 'record_create_index_pending' : 'record_create_commit_uncertain',
              message: confirmed
                ? 'Markdown 文件已确认包含此记录；DataStore 尚未索引成功，避免重复创建。'
                : '读取文件失败，无法确认记录当前状态。请检查文件后再处理，不应直接重试写入。',
            }],
          });
        }
        throw new Error(`record_create_scan_failed:${preview.recordId}`);
      }

      return buildSuccessResult('create', {
        affectedPath: path,
        affectedRecordId: createdRecord?.id,
        refresh: refreshPlan,
        feedback: { notice: '✅ 已创建' },
        // Only a newly created open Task should offer/start execution. Timeline quick-capture
        // creates historical completed Tasks and must never start a timer for them.
        followUp: buildCreateRecordFollowUp(createdRecord),
        warnings,
      });
    } catch (error) {
      return mapSubmitError('create', error, warnings);
    }
  }
}
