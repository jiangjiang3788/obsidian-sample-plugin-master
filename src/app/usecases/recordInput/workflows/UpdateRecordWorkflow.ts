import {
  buildRecordOutputPlan,
  buildRecordPersistencePlan,
  buildSuccessResult,
  buildValidationErrorResult,
  finalizeRecordSubmitResult,
} from '@core/recordInput/public';
import type { RecordSubmitIssue, RecordSubmitResult, SubmitUpdateRecordParams } from '@core/recordInput/public';
import { readOptionText } from '@core/semantics/public';
import { normalizeTaskSeriesEditIntent } from '@core/records/public';

import { mapSubmitError } from '../error';
import { getItemFilePath } from '../locator';
import { buildPlanConsistencyIssues } from '../planGuard';
import { buildRefreshPlan } from '../paths';
import { prepareTemplateSubmit } from '../templateSubmit';
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

function hasAnyKey(data: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(data, key));
}

function normalizedTaskStatus(value: unknown): string {
  return optionScalar(value).toLowerCase();
}

export function buildTaskLifecycleBypassIssue(
  item: Pick<SubmitUpdateRecordParams['item'], 'recordType' | 'status'>,
  formData: Record<string, unknown>,
): RecordSubmitIssue | null {
  if (item.recordType !== 'task') return null;
  const current = normalizedTaskStatus(item.status);
  const requested = normalizedTaskStatus(formData.status ?? formData['状态'] ?? current);
  if (!requested || requested === current) return null;
  return {
    code: 'task_status_requires_lifecycle_command',
    field: 'status',
    message: '已有任务的状态不能通过普通编辑直接修改；请使用完成、取消、重新打开或跳过命令。',
  };
}

function taskSeriesDefaults(renderData: Record<string, unknown>) {
  const update: Record<string, unknown> = {};

  if (hasAnyKey(renderData, ['任务内容', '内容', 'content'])) {
    update.content = optionScalar(renderData['任务内容'] ?? renderData['内容'] ?? renderData.content);
  }
  if (hasAnyKey(renderData, ['goalPath', '目标'])) {
    update.goalPath = nullableText(renderData.goalPath ?? renderData['目标']);
  }
  if (hasAnyKey(renderData, ['优先级', 'priority'])) {
    update.priority = nullableText(renderData['优先级'] ?? renderData.priority);
  }
  if (hasAnyKey(renderData, ['重要程度', 'importance'])) {
    update.importance = nullableText(renderData['重要程度'] ?? renderData.importance);
  }
  if (hasAnyKey(renderData, ['紧急程度', 'urgency'])) {
    update.urgency = nullableText(renderData['紧急程度'] ?? renderData.urgency);
  }
  if (hasAnyKey(renderData, ['预计时长', 'expectedDurationMinutes'])) {
    update.expectedDurationMinutes = durationValue(renderData['预计时长'] ?? renderData.expectedDurationMinutes);
  }
  if (hasAnyKey(renderData, ['精力要求', 'energyDemand'])) {
    update.energyDemand = nullableText(renderData['精力要求'] ?? renderData.energyDemand);
  }
  if (hasAnyKey(renderData, ['脑力要求', 'brainDemand'])) {
    update.brainDemand = nullableText(renderData['脑力要求'] ?? renderData.brainDemand);
  }
  if (hasAnyKey(renderData, ['体力要求', 'physicalDemand'])) {
    update.physicalDemand = nullableText(renderData['体力要求'] ?? renderData.physicalDemand);
  }
  if (hasAnyKey(renderData, ['可用场景', 'availabilityContexts'])) {
    update.availabilityContexts = contextValues(renderData['可用场景'] ?? renderData.availabilityContexts);
  }
  if (hasAnyKey(renderData, ['恢复意图', 'recoveryIntent'])) {
    update.recoveryIntent = boolValue(renderData['恢复意图'] ?? renderData.recoveryIntent);
  }

  return update;
}

type ExplicitTaskSeriesEditPlan =
  | { error: 'task_series_edit_requires_recurring_task' }
  | {
      seriesId: string;
      scope: 'current_and_future' | 'series_rules';
      update: Record<string, unknown>;
    };

export function buildExplicitTaskSeriesEditPlan(
  params: Pick<SubmitUpdateRecordParams, 'item' | 'meta'>,
  renderData: Record<string, unknown>,
): ExplicitTaskSeriesEditPlan | null {
  const intent = normalizeTaskSeriesEditIntent(params.meta?.taskSeriesEdit);
  if (!intent || intent.scope === 'current') return null;
  const seriesId = String(params.item.seriesId || '').trim();
  if (params.item.recordType !== 'task' || !seriesId) {
    return { error: 'task_series_edit_requires_recurring_task' as const };
  }
  return {
    seriesId,
    scope: intent.scope,
    update: {
      ...(intent.scope === 'current_and_future' ? taskSeriesDefaults(renderData) : {}),
      ...(intent.recurrence ? { recurrence: intent.recurrence } : {}),
    },
  };
}

export class UpdateRecordWorkflow {
  constructor(private runtime: RecordInputWorkflowRuntime) {}

  private async applyExplicitSeriesEdit(
    params: SubmitUpdateRecordParams,
    renderData: Record<string, unknown>,
  ): Promise<RecordSubmitIssue | null> {
    const plan = buildExplicitTaskSeriesEditPlan(params, renderData);
    if (!plan) return null;
    if ('error' in plan) {
      return {
        code: plan.error,
        message: '只有周期任务才能修改系列规则。',
      };
    }

    try {
      await this.runtime.deps.itemService.updateTaskSeries(plan.seriesId, plan.update, { includeCurrent: false });
      return null;
    } catch (error: any) {
      return {
        code: 'task_series_explicit_update_failed',
        message: `周期任务系列保存失败：${error?.message || String(error)}`,
      };
    }
  }

  private async submitSeriesRulesOnly(
    params: SubmitUpdateRecordParams,
    renderData: Record<string, unknown>,
    warnings: RecordSubmitResult['warnings'],
  ): Promise<RecordSubmitResult | null> {
    const intent = normalizeTaskSeriesEditIntent(params.meta?.taskSeriesEdit);
    if (!intent || intent.scope !== 'series_rules') return null;

    const issue = await this.applyExplicitSeriesEdit(params, renderData);
    if (issue) return buildValidationErrorResult('update', [issue], warnings);

    const seriesId = String(params.item.seriesId || '').trim();
    const seriesPath = this.runtime.deps.dataStore.getRecordLocation(seriesId)?.path || getItemFilePath(params.item) || undefined;
    return finalizeRecordSubmitResult(this.runtime.deps.dataStore, buildSuccessResult('update', {
      affectedPath: seriesPath,
      affectedRecordId: seriesId,
      refresh: buildRefreshPlan([seriesPath]),
      feedback: { notice: '已保存周期系列规则；当前任务和历史任务未改动。' },
      warnings: warnings || [],
    }));
  }

  async submit(params: SubmitUpdateRecordParams): Promise<RecordSubmitResult> {
    let warnings: RecordSubmitResult['warnings'] = [];

    try {
      // As with create, update is a result boundary: preparation and output
      // planning errors must be mapped instead of escaping as rejected promises.
      const prepared = prepareTemplateSubmit({
        kernel: this.runtime.getKernel(),
        operation: 'update',
        recordTypeId: params.recordTypeId,
        item: params.item,
        formData: { ...params.formData, seriesId: params.item.seriesId },
        normalizeMode: 'edit',
        validateMode: 'edit',
      });
      if (!prepared.ok) return prepared.result;

      const { resolved, normalized } = prepared.submit;
      warnings = prepared.submit.warnings;
      const lifecycleIssue = buildTaskLifecycleBypassIssue(params.item, normalized.normalizedFormData);
      if (lifecycleIssue) return buildValidationErrorResult('update', [lifecycleIssue], warnings);
      const outputPlan = buildRecordOutputPlan({
        template: resolved.template,
        formData: normalized.normalizedFormData,
        recordId: params.item.id,
      });
      const seriesRulesOnly = await this.submitSeriesRulesOnly(params, outputPlan.renderData, warnings);
      if (seriesRulesOnly) return seriesRulesOnly;
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

      if (persistencePlan.pathChanged && persistencePlan.writeMode === 'move_and_replace') {
        const result = await new RecordMigrationTransaction(this.runtime).execute({
          item: params.item,
          template: resolved.template,
          resolved,
          normalized,
          outputPlan,
          persistencePlan,
          warnings,
          signal: params.signal,
        });
        if (result.status === 'success' || result.status === 'partial_success') {
          const seriesIssue = await this.applyExplicitSeriesEdit(params, outputPlan.renderData);
          if (seriesIssue) {
            return {
              ...result,
              status: 'partial_success',
              warnings: [...(result.warnings || []), seriesIssue],
              feedback: { notice: '当前任务已保存，但周期系列同步失败。' },
            };
          }
        }
        return result;
      }

      const path = await this.runtime.deps.inputService.updateExistingRecord(
        params.item,
        resolved.template,
        normalized.normalizedFormData,
        { signal: params.signal, autoRefresh: false },
      );
      const seriesIssue = await this.applyExplicitSeriesEdit(params, outputPlan.renderData);
      const baseWarnings = warnings || [];
      const nextWarnings = seriesIssue ? [...baseWarnings, seriesIssue] : baseWarnings;
      return finalizeRecordSubmitResult(this.runtime.deps.dataStore, buildSuccessResult('update', {
        status: seriesIssue ? 'partial_success' : 'success',
        affectedPath: path,
        affectedRecordId: params.item.id,
        refresh: buildRefreshPlan([path]),
        feedback: { notice: seriesIssue ? '当前任务已保存，但周期系列同步失败。' : '✅ 已保存修改' },
        warnings: nextWarnings,
      }));
    } catch (error) {
      return finalizeRecordSubmitResult(this.runtime.deps.dataStore, mapSubmitError('update', error, warnings, {
        refreshPaths: [getItemFilePath(params.item)],
      }));
    }
  }
}
