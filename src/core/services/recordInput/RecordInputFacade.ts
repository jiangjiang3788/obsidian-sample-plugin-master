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

export interface RecordInputEditorStateLike {
  blockId?: string | null;
  themeId?: string | null;
  formData?: Record<string, any> | null;
  template?: {
    fields?: TemplateField[];
  } | null;
  meta?: RecordInputMeta;
}

export interface BuildRecordCreateDraftParams {
  state: RecordInputEditorStateLike;
  context?: Record<string, any>;
  source?: Extract<RecordInputSource, 'timer' | 'quickinput' | 'view_quick_create' | 'unknown'>;
}

export interface BuildCreateRecordSubmitParamsInput {
  state: RecordInputEditorStateLike;
  context?: Record<string, any>;
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
  if (typeof value === 'object') {
    const raw = (value as any).value ?? (value as any).label;
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

export function buildRecordDraftContext(...parts: Array<Record<string, any> | null | undefined>): Record<string, any> {
  return Object.assign({}, ...parts.filter(Boolean));
}

export function normalizeRecordInputFieldValueForTemplate(field: TemplateField, value: any): any {
  if (value === undefined || value === null || value === '') return value;

  const isSelectable = ['select', 'radio', 'rating'].includes(field.type);
  if (!isSelectable) return value;

  if (value && typeof value === 'object' && 'value' in value && 'label' in value) {
    return value;
  }

  const options = field.options || [];
  if (Array.isArray(value)) {
    return value.map((entry) => {
      if (entry && typeof entry === 'object' && 'value' in entry && 'label' in entry) return entry;
      const matched = options.find((option) => option.value === entry || option.label === entry);
      return matched ? { value: matched.value, label: matched.label || matched.value } : entry;
    });
  }

  const matched = options.find((option) => option.value === value || option.label === value);
  return matched ? { value: matched.value, label: matched.label || matched.value } : value;
}

export function normalizeRecordInputFormDataForTemplate(template: { fields?: TemplateField[] } | undefined | null, formData: Record<string, any>): Record<string, any> {
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
