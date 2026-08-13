import {
  buildRecordOutputPlan,
  buildRecordPersistencePlan,
  buildSuccessResult,
  buildValidationErrorResult,
  finalizeRecordSubmitResult,
} from '@core/recordInput/public';
import type { RecordSubmitIssue, RecordSubmitResult, SubmitUpdateRecordParams } from '@core/recordInput/public';
import { readOptionText } from '@core/semantics/public';

import { mapSubmitError } from '../error';
import { getItemFilePath } from '../locator';
import { buildPlanConsistencyIssues } from '../planGuard';
import { buildRefreshPlan } from '../paths';
import { getTemplateExecutionMeta, prepareTemplateSubmit } from '../templateSubmit';
import { RecordMigrationTransaction } from './RecordMigrationTransaction';
import type { RecordInputWorkflowRuntime } from './types';


function optionScalar(value: unknown): string {
  const option = readOptionText(value);
  return String(option.value || option.label || value || '').trim();
}

function nullableText(value: unknown): string | null {
  const normalized = optionScalar(value);
  return normalized || null;
}

function durationValue(value: unknown): number | null {
  const parsed = Number(optionScalar(value));
  return Number.isFinite(parsed) && parsed > 0 ? Math.max(1, Math.min(240, Math.round(parsed))) : null;
}

function contextValues(value: unknown): Array<'any' | 'work' | 'home' | 'commute' | 'out'> {
  const rawValues = Array.isArray(value) ? value : String(value ?? '').split(/[,，\n]/);
  const aliases: Record<string, 'any' | 'work' | 'home' | 'commute' | 'out'> = {
    any: 'any', '任意': 'any',
    work: 'work', '工作': 'work', '公司': 'work',
    home: 'home', '家': 'home', '居家': 'home',
    commute: 'commute', '通勤': 'commute',
    out: 'out', '外出': 'out',
  };
  const values = rawValues
    .map((entry) => optionScalar(entry))
    .map((entry) => aliases[entry.toLowerCase()] || aliases[entry])
    .filter((entry): entry is 'any' | 'work' | 'home' | 'commute' | 'out' => !!entry);
  return [...new Set(values)];
}

function boolValue(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['true', '1', 'yes', '是', 'on'].includes(normalized);
}

function taskSeriesDefaults(renderData: Record<string, unknown>) {
  return {
    content: optionScalar(renderData['任务内容'] ?? renderData['内容'] ?? renderData.content),
    goalId: nullableText(renderData.goalId ?? renderData['目标ID']),
    goalPath: nullableText(renderData.goalPath ?? renderData['目标']),
    themePath: nullableText(renderData.themePath ?? renderData['主题']),
    priority: nullableText(renderData['优先级'] ?? renderData.priority) as any,
    expectedDurationMinutes: durationValue(renderData['预计时长'] ?? renderData.expectedDurationMinutes),
    energyDemand: nullableText(renderData['精力要求'] ?? renderData.energyDemand) as any,
    brainDemand: nullableText(renderData['脑力要求'] ?? renderData.brainDemand) as any,
    physicalDemand: nullableText(renderData['体力要求'] ?? renderData.physicalDemand) as any,
    availabilityContexts: contextValues(renderData['可用场景'] ?? renderData.availabilityContexts),
    recoveryIntent: boolValue(renderData['恢复意图'] ?? renderData.recoveryIntent),
  };
}

export class UpdateRecordWorkflow {
  constructor(private runtime: RecordInputWorkflowRuntime) {}

  private async syncRecurringTaskSeries(
    params: SubmitUpdateRecordParams,
    renderData: Record<string, unknown>,
  ): Promise<RecordSubmitIssue | null> {
    const seriesId = String(params.item.seriesId || '').trim();
    if (params.item.coreBlock !== 'task' || !seriesId) return null;
    try {
      await this.runtime.deps.itemService.updateTaskSeries(seriesId, taskSeriesDefaults(renderData), { includeCurrent: false });
      return null;
    } catch (error: any) {
      return {
        code: 'task_series_defaults_sync_failed',
        message: `当前任务已保存，但周期任务默认值同步失败：${error?.message || String(error)}`,
      };
    }
  }

  async submit(params: SubmitUpdateRecordParams): Promise<RecordSubmitResult> {
    const prepared = prepareTemplateSubmit({
      kernel: this.runtime.getKernel(),
      operation: 'update',
      blockId: params.blockId,
      themeId: params.themeId ?? null,
      item: params.item,
      formData: { ...params.formData, seriesId: params.item.seriesId },
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
      recordId: params.item.id,
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
        const result = await new RecordMigrationTransaction(this.runtime).execute({
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
        if (result.status === 'success' || result.status === 'partial_success') {
          const seriesIssue = await this.syncRecurringTaskSeries(params, outputPlan.renderData);
          if (seriesIssue) {
            return {
              ...result,
              status: 'partial_success',
              warnings: [...(result.warnings || []), seriesIssue],
              feedback: { notice: '当前任务已保存，但周期任务默认值同步失败。' },
            };
          }
        }
        return result;
      }

      const path = await this.runtime.deps.inputService.updateExistingRecord(
        params.item,
        resolved.template,
        normalized.normalizedFormData,
        resolved.theme ?? undefined,
        templateMeta,
        { signal: params.signal, autoRefresh: false },
      );
      const seriesIssue = await this.syncRecurringTaskSeries(params, outputPlan.renderData);
      const nextWarnings = seriesIssue ? [...warnings, seriesIssue] : warnings;
      return finalizeRecordSubmitResult(this.runtime.deps.dataStore, buildSuccessResult('update', {
        status: seriesIssue ? 'partial_success' : 'success',
        affectedPath: path,
        affectedRecordId: params.item.id,
        refresh: buildRefreshPlan([path]),
        feedback: { notice: seriesIssue ? '当前任务已保存，但周期任务默认值同步失败。' : '✅ 已保存修改' },
        warnings: nextWarnings,
      }));
    } catch (error) {
      return finalizeRecordSubmitResult(this.runtime.deps.dataStore, mapSubmitError('update', error, warnings, {
        refreshPaths: [getItemFilePath(params.item)],
      }));
    }
  }
}
