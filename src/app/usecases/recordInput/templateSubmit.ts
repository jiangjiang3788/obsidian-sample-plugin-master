import { applyRecordGoalContext, buildValidationErrorResult } from '@core/recordInput/public';
import type { RecordCaptureTemplate, RecordViewItem } from '@core/types/public';
import type { NormalizeRecordInputParams, NormalizeRecordInputResult, RecordSubmitResult, ResolveDependenciesResult } from '@core/recordInput/public';
import type { RecordInputKernel } from '@core/recordInput/public';

export type ResolvedTemplateDependencies = ResolveDependenciesResult & {
  recordTypeId: string;
  template: RecordCaptureTemplate;
};

export interface PreparedTemplateSubmit {
  resolved: ResolvedTemplateDependencies;
  normalized: NormalizeRecordInputResult;
  warnings: RecordSubmitResult['warnings'];
}

export type PrepareTemplateSubmitResult =
  | { ok: true; submit: PreparedTemplateSubmit }
  | { ok: false; result: RecordSubmitResult };

export function prepareTemplateSubmit(params: {
  kernel: RecordInputKernel;
  operation: 'create' | 'update';
  recordTypeId: string;
  item?: RecordViewItem;
  formData: Record<string, unknown>;
  context?: Record<string, unknown>;
  normalizeMode: NormalizeRecordInputParams['mode'];
  validateMode: 'create' | 'edit';
}): PrepareTemplateSubmitResult {
  const withGoalContext = applyRecordGoalContext({
    formData: params.formData,
    context: params.context,
    item: params.item,
  });
  const resolved = params.kernel.resolveMissingDependencies({
    recordTypeId: params.recordTypeId,
    item: params.item,
    context: { ...(params.context || {}), ...withGoalContext.formData },
    requireDirectGoalTemplate: params.operation === 'create',
  });

  if (resolved.errors.length > 0 || !resolved.template || !resolved.recordTypeId) {
    return {
      ok: false,
      result: buildValidationErrorResult(params.operation, [
        ...resolved.errors,
        ...(!resolved.template ? [{ code: 'record_template_missing', message: '当前记录没有可用的有效模板。' }] : []),
      ], resolved.warnings),
    };
  }

  const strictResolved = resolved as ResolvedTemplateDependencies;
  const normalized = params.kernel.normalizeRecordInput({
    template: strictResolved.template,
    formData: withGoalContext.formData,
    context: params.context,
    mode: params.normalizeMode,
  });
  const validation = params.kernel.validateRecordInput({
    template: strictResolved.template,
    formData: normalized.normalizedFormData,
    mode: params.validateMode,
    item: params.item,
  });
  const warnings = [...strictResolved.warnings, ...normalized.warnings, ...validation.warnings];
  if (!validation.ok) {
    return {
      ok: false,
      result: buildValidationErrorResult(params.operation, validation.errors, warnings),
    };
  }

  return {
    ok: true,
    submit: {
      resolved: strictResolved,
      normalized,
      warnings,
    },
  };
}
