import {
  buildValidationErrorResult,
} from '@core/public';
import type {
  BlockTemplate,
  Item,
  NormalizeRecordInputParams,
  NormalizeRecordInputResult,
  RecordInputKernel,
  RecordSubmitResult,
  ResolveDependenciesResult,
  ThemeDefinition,
} from '@core/public';
import type { CreateLocatorContext } from './locator';
import { inferCreatedItemType } from './locator';
import { getBeforeMaxLine } from './paths';

export interface TemplateExecutionMeta {
  templateId: string;
  templateSourceType: 'core-block' | 'goal-template';
}

export type ResolvedTemplateDependencies = ResolveDependenciesResult & {
  blockId: string;
  template: BlockTemplate;
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
  item?: Item;
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
  template: BlockTemplate,
): TemplateExecutionMeta {
  return {
    templateId: resolved.meta.templateId ?? template.id,
    templateSourceType: resolved.meta.templateSourceType ?? 'core-block',
  };
}

export function buildCreatedRecordLocatorContext(params: {
  template: BlockTemplate;
  theme?: ThemeDefinition | null;
  meta: TemplateExecutionMeta;
  outputContent: string;
  normalizedFormData: Record<string, unknown>;
  appendMode: 'header' | 'append';
  targetHeader?: string | null;
  beforeItems: Item[];
}): CreateLocatorContext {
  return {
    outputContent: params.outputContent,
    normalizedFormData: params.normalizedFormData,
    templateId: params.meta.templateId,
    templateSourceType: params.meta.templateSourceType,
    themePath: params.theme?.path ?? null,
    blockCategoryKey: params.template.categoryKey ?? null,
    itemTypeHint: inferCreatedItemType(params.template.outputTemplate),
    appendMode: params.appendMode,
    targetHeader: params.targetHeader ?? null,
    beforeMaxLine: getBeforeMaxLine(params.beforeItems),
  };
}
