import { applyRecordRefreshPlan, buildSuccessResult, finalizeRecordSubmitResult } from '@core/recordInput/public';
import type { BlockTemplate, Item, ThemeDefinition } from '@core/types/public';
import type {
  NormalizeRecordInputResult,
  RecordOutputPlan,
  RecordPersistencePlan,
  RecordSubmitResult,
  ResolveDependenciesResult,
} from '@core/recordInput/public';

import { mapSubmitError } from '../error';
import { issue, toArray } from '../issues';
import { getItemFilePath, locateCreatedRecord } from '../locator';
import { buildRefreshPlan, getFileItemsByPath } from '../paths';
import {
  buildCreatedRecordLocatorContext,
  type TemplateExecutionMeta,
} from '../templateSubmit';
import type { RecordInputWorkflowRuntime } from './types';

export interface RecordMigrationTransactionParams {
  item: Item;
  template: BlockTemplate;
  theme?: ThemeDefinition | null;
  resolved: ResolveDependenciesResult;
  normalized: NormalizeRecordInputResult;
  templateMeta: TemplateExecutionMeta;
  outputPlan: RecordOutputPlan;
  persistencePlan: RecordPersistencePlan;
  warnings: RecordSubmitResult['warnings'];
  signal?: AbortSignal;
}

/**
 * Safe update transaction for path-changing edits/conversions.
 *
 * The transaction is intentionally not a rollback transaction: it writes the new
 * record first, then deletes the old record. If deletion fails, the new record is
 * kept and the old record is preserved with a partial_success result so the user
 * can manually clean up without data loss.
 */
export class RecordMigrationTransaction {
  constructor(private runtime: RecordInputWorkflowRuntime) {}

  async execute(params: RecordMigrationTransactionParams): Promise<RecordSubmitResult> {
    const targetPath = params.outputPlan.targetFilePath || '';
    const beforeTargetItems = getFileItemsByPath(this.runtime.deps.dataStore, targetPath);
    const createdPath = await this.runtime.deps.inputService.createRecordAtPlannedLocation(
      params.template,
      params.normalized.normalizedFormData,
      params.theme ?? undefined,
      params.templateMeta,
      { signal: params.signal, autoRefresh: false },
    );

    const scannedNewPath = await applyRecordRefreshPlan(this.runtime.deps.dataStore, buildRefreshPlan([createdPath], false));
    const afterTargetItems = scannedNewPath.get(createdPath) ?? getFileItemsByPath(this.runtime.deps.dataStore, createdPath);
    const createdRecord = locateCreatedRecord(beforeTargetItems, afterTargetItems, buildCreatedRecordLocatorContext({
      template: params.template,
      theme: params.theme,
      meta: params.templateMeta,
      outputContent: params.outputPlan.outputContent,
      normalizedFormData: params.normalized.normalizedFormData,
      appendMode: params.outputPlan.targetHeader ? 'header' : 'append',
      targetHeader: params.outputPlan.targetHeader ?? null,
      beforeItems: beforeTargetItems,
    }));

    try {
      const deletedPath = await this.runtime.deps.inputService.deleteExistingRecord(params.item, {
        signal: params.signal,
        autoRefresh: false,
      });
      return finalizeRecordSubmitResult(this.runtime.deps.dataStore, buildSuccessResult('update', {
        affectedPath: createdPath,
        affectedRecordId: createdRecord?.id ?? params.item.id,
        refresh: buildRefreshPlan([createdPath, deletedPath]),
        feedback: {
          notice: `✅ 已迁移保存：${params.persistencePlan.originalPath || '原位置'} → ${createdPath}`,
        },
        warnings: [
          ...(params.warnings || []),
          issue(
            'record_update_moved_to_new_path',
            `路径变化已执行安全迁移：已先写入 ${createdPath}，再删除原位置 ${params.persistencePlan.originalPath || '未知位置'}。`,
          ),
        ],
      }));
    } catch (deleteError) {
      return finalizeRecordSubmitResult(this.runtime.deps.dataStore, {
        status: 'partial_success',
        operation: 'update',
        affectedPath: createdPath,
        affectedRecordId: createdRecord?.id ?? params.item.id,
        refresh: buildRefreshPlan([createdPath, params.persistencePlan.originalPath]),
        feedback: {
          notice: `已写入新位置 ${createdPath}，但旧记录删除失败；请检查并手动清理 ${params.persistencePlan.originalPath || '原位置'}。`,
        },
        warnings: params.warnings,
        errors: [
          issue(
            'record_update_old_entry_delete_failed',
            `安全迁移保存：已先写入新位置 ${createdPath}，但删除原记录 ${params.persistencePlan.originalPath || '未知位置'} 失败。为避免数据丢失，旧记录被保留，请手动检查并清理。`,
          ),
          ...toArray(mapSubmitError('update', deleteError).errors),
        ],
      });
    }
  }
}
