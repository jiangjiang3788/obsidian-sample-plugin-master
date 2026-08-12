import { buildValidationErrorResult } from '@core/recordInput/public';
import type { RecordCaptureTemplate, RecordViewItem } from '@core/types/public';
import type { NormalizeRecordInputParams, NormalizeRecordInputResult, RecordSubmitResult, ResolveDependenciesResult } from '@core/recordInput/public';
import type { RecordInputKernel } from '@core/recordInput/public';

export interface TemplateExecutionMeta {
  templateId: string;
  templateSourceType: 'core-block' | 'goal-template';
}

export type ResolvedTemplateDependencies = ResolveDependenciesResult & {
  blockId: string;
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
  blockId: string;
  themeId?: string | null;
  item?: RecordViewItem;
  formData: Record<string, unknown>;
  context?: Record<string, unknown>;
  normalizeMode: NormalizeRecordInputParams['mode'];
  validateMode: 'create' | 'edit';
}): PrepareTemplateSubmitResult {
  const resolved = params.kernel.resolveMissingDependencies({
    blockId: params.blockId,
    themeId: params.themeId ?? null,
    item: params.item,
    context: { ...(params.context || {}), ...params.formData },
  });

  if (resolved.errors.length > 0 || !resolved.template || !resolved.blockId) {
    return {
      ok: false,
      result: buildValidationErrorResult(params.operation, [
        ...resolved.errors,
        ...(!resolved.template ? [{ code: 'record_template_missing', message: 'No effective template is available for this record.' }] : []),
      ], resolved.warnings),
    };
  }

  const strictResolved = resolved as ResolvedTemplateDependencies;
  const normalized = params.kernel.normalizeRecordInput({
    template: strictResolved.template,
    formData: params.formData,
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

export function getTemplateExecutionMeta(
  resolved: ResolveDependenciesResult,
  template: RecordCaptureTemplate,
): TemplateExecutionMeta {
  return {
    templateId: resolved.meta.templateId ?? template.id,
    templateSourceType: resolved.meta.templateSourceType ?? 'core-block',
  };
}
