import type {
  Item,
  QuickInputSaveData,
  RecordInputMeta,
  RecordInputSource,
  RecordOutputPlan,
  RecordPersistencePlan,
  RecordSubmitResult,
  SubmitCreateRecordParams,
  SubmitUpdateRecordParams,
  TemplateField,
} from '@/core/types';
import { findMatchingOption, isOptionLikeValue, readOptionText } from '@/core/semantics/option';

export interface RecordInputEditorStateLike {
  blockId?: string | null;
  themeId?: string | null;
  formData?: Record<string, unknown> | null;
  template?: {
    fields?: TemplateField[];
  } | null;
  meta?: RecordInputMeta;
}

export interface BuildRecordCreateDraftParams {
  state: RecordInputEditorStateLike;
  context?: Record<string, unknown>;
  source?: Extract<RecordInputSource, 'timer' | 'quickinput' | 'view_quick_create' | 'unknown'>;
}

export interface BuildCreateRecordSubmitParamsInput {
  state: RecordInputEditorStateLike;
  context?: Record<string, unknown>;
  source?: SubmitCreateRecordParams['source'];
  signal?: AbortSignal;
}

export interface BuildUpdateRecordSubmitParamsInput {
  state: RecordInputEditorStateLike;
  item: Item;
  expectedOutputPlan?: Pick<RecordOutputPlan, 'targetFilePath' | 'targetHeader'> | null;
  expectedPersistencePlan?: Pick<RecordPersistencePlan, 'originalPath' | 'pathChanged' | 'writeMode'> | null;
  source?: SubmitUpdateRecordParams['source'];
  signal?: AbortSignal;
}

export function hasRecordInputRequiredValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (isOptionLikeValue(value)) {
    const raw = value.value ?? value.label;
    return raw !== undefined && raw !== null && String(raw).trim() !== '';
  }
  return String(value).trim() !== '';
}

export function findMissingRecordInputRequiredFields(state: RecordInputEditorStateLike): string[] {
  const fields = state.template?.fields || [];
  const formData = state.formData || {};
  return fields
    .filter((field: TemplateField) => field?.required)
    .filter((field: TemplateField) => !hasRecordInputRequiredValue(formData[field.key] ?? formData[field.label]))
    .map((field: TemplateField) => field.label || field.key)
    .filter(Boolean);
}

export function assertRecordInputRequiredFields(state: RecordInputEditorStateLike): void {
  const missingRequired = findMissingRecordInputRequiredFields(state);
  if (missingRequired.length > 0) {
    throw new Error(`请补充必填字段：${missingRequired.join('、')}`);
  }
}

export function buildRecordCreateDraftFromEditorState({
  state,
  context,
  source,
}: BuildRecordCreateDraftParams): QuickInputSaveData {
  return {
    blockId: state.blockId || undefined,
    themeId: state.themeId ?? null,
    formData: { ...(state.formData || {}) },
    context,
    meta: state.meta,
    source: source ?? 'quickinput',
  };
}

export function buildCreateRecordSubmitParamsFromEditorState({
  state,
  context,
  source,
  signal,
}: BuildCreateRecordSubmitParamsInput): SubmitCreateRecordParams {
  return {
    blockId: String(state.blockId || ''),
    themeId: state.themeId ?? null,
    formData: { ...(state.formData || {}) },
    context,
    meta: state.meta,
    signal,
    source: source ?? 'quickinput',
  };
}

export function buildUpdateRecordSubmitParamsFromEditorState({
  state,
  item,
  expectedOutputPlan,
  expectedPersistencePlan,
  source,
  signal,
}: BuildUpdateRecordSubmitParamsInput): SubmitUpdateRecordParams {
  return {
    item,
    blockId: String(state.blockId || ''),
    themeId: state.themeId ?? null,
    formData: { ...(state.formData || {}) },
    meta: state.meta,
    expectedOutputPlan: expectedOutputPlan ?? null,
    expectedPersistencePlan: expectedPersistencePlan ?? null,
    signal,
    source: source ?? 'quickinput',
  };
}

export function buildRecordDraftContext(...parts: Array<Record<string, unknown> | null | undefined>): Record<string, unknown> {
  return Object.assign({}, ...parts.filter(Boolean));
}

export function normalizeRecordInputFieldValueForTemplate(field: TemplateField, value: unknown): unknown {
  if (value === undefined || value === null || value === '') return value;

  const isSelectable = ['select', 'radio', 'rating'].includes(field.type);
  if (!isSelectable) return value;

  if (isOptionLikeValue(value) && 'value' in value && 'label' in value) {
    return value;
  }

  const options = field.options || [];
  if (Array.isArray(value)) {
    return value.map((entry) => {
      if (isOptionLikeValue(entry) && 'value' in entry && 'label' in entry) return entry;
      const matched = findMatchingOption(options, entry);
      if (!matched) return entry;
      const text = readOptionText(matched);
      return { value: text.value, label: text.label || text.value };
    });
  }

  const matched = findMatchingOption(options, value);
  if (!matched) return value;
  const text = readOptionText(matched);
  return { value: text.value, label: text.label || text.value };
}

export function normalizeRecordInputFormDataForTemplate(template: { fields?: TemplateField[] } | undefined | null, formData: Record<string, unknown>): Record<string, unknown> {
  if (!template?.fields?.length) return { ...formData };

  const next = { ...formData };
  template.fields.forEach((field) => {
    if (!(field.key in next)) return;
    next[field.key] = normalizeRecordInputFieldValueForTemplate(field, next[field.key]);
  });
  return next;
}

export function buildBatchCreateRecordSubmitResult(results: RecordSubmitResult[]): RecordSubmitResult {
  const succeeded = results.filter((result) => result.status === 'success');
  const failed = results.filter((result) => result.status !== 'success' && result.status !== 'cancelled');
  const scanPaths = Array.from(new Set(results.flatMap((result) => result.refresh.scanPaths || [])));
  const warnings = results.flatMap((result) => result.warnings || []);
  const errors = results.flatMap((result) => result.errors || []);

  if (failed.length === 0) {
    return {
      status: 'success',
      operation: 'create',
      refresh: {
        scanPaths,
        notify: results.some((result) => result.refresh.notify),
      },
      feedback: {
        notice: `✅ 批量保存完成：成功 ${succeeded.length} 条`,
      },
      warnings,
    };
  }

  if (succeeded.length === 0) {
    return {
      status: 'error',
      operation: 'create',
      refresh: {
        scanPaths,
        notify: results.some((result) => result.refresh.notify),
      },
      feedback: {
        notice: `❌ 批量保存失败：0/${results.length} 成功`,
      },
      warnings,
      errors,
    };
  }

  return {
    status: 'partial_success',
    operation: 'create',
    refresh: {
      scanPaths,
      notify: results.some((result) => result.refresh.notify),
    },
    feedback: {
      notice: `⚠️ 批量保存完成：成功 ${succeeded.length} 条，失败 ${failed.length} 条`,
    },
    warnings,
    errors,
  };
}
