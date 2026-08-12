import type { RecordViewItem, TemplateField } from '@core/types/public';
import type { UiPort } from '@core/ports/public';
import {
  getFieldEditPolicy,
  getTemplateFieldInputType,
  getTemplateFieldSemantic,
  normalizeEditableFieldKey,
  normalizeTemplateFieldValue,
} from '@core/fields/public';
import type { UseCases } from '@/app/usecases';
import { runUiRecordAction } from './runUiRecordAction';

export interface CommitExcelCellFromViewParams {
  uiPort: UiPort;
  useCases: UseCases;
  item: RecordViewItem;
  field: string;
  canonicalField?: string;
  oldValue?: unknown;
  nextValue: unknown;
  showSuccessNotice?: boolean;
}

export interface CommitExcelCellFromViewResult {
  ok: boolean;
  message?: string;
  normalizedValue?: unknown;
}

const EXCEL_SAFE_INLINE_FIELDS = new Set([
  'content',
  'editableText',
  'title',
  'date',
  'startTime',
  'endTime',
  'duration',
  'rating',
  'tags',
]);

function isExcelInlineCommitSupported(canonicalField: string): boolean {
  return EXCEL_SAFE_INLINE_FIELDS.has(canonicalField) || canonicalField.startsWith('extra.');
}

function fieldToken(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function stripExtraPrefix(field: string): string {
  return field.startsWith('extra.') ? field.slice('extra.'.length) : field;
}

function templateFieldTokens(field: TemplateField): string[] {
  return [field.key, field.label, field.semantic, field.semanticType]
    .map(fieldToken)
    .filter(Boolean);
}

function semanticForExcelField(canonicalField: string): ReturnType<typeof getTemplateFieldSemantic> | null {
  if (canonicalField === 'title') return 'title';
  if (canonicalField === 'content' || canonicalField === 'editableText') return 'body';
  if (canonicalField === 'date') return 'date';
  if (canonicalField === 'startTime') return 'startTime';
  if (canonicalField === 'endTime') return 'endTime';
  if (canonicalField === 'duration') return 'duration';
  if (canonicalField === 'rating') return 'rating';
  if (canonicalField === 'tags') return 'tags';
  return null;
}

function resolveTemplateFieldForExcelCommit(fields: TemplateField[] | undefined, canonicalField: string): TemplateField | null {
  const list = fields || [];
  const canonical = normalizeEditableFieldKey(canonicalField);
  const targetSemantic = semanticForExcelField(canonical);

  if (targetSemantic) {
    const semanticMatch = list.find(field => getTemplateFieldSemantic(field) === targetSemantic);
    if (semanticMatch) return semanticMatch;
  }

  const customName = stripExtraPrefix(canonical);
  const aliasesByCanonical: Record<string, string[]> = {
    title: ['title', '标题', '名称', 'name'],
    content: ['content', 'body', 'text', '内容', '正文', '任务内容', '记录内容'],
    editableText: ['editabletext', 'editableText', 'content', 'body', 'text', '内容', '正文', '任务内容', '记录内容'],
    date: ['date', '日期'],
    startTime: ['starttime', 'start', 'time', '开始', '开始时间', '时间'],
    endTime: ['endtime', 'end', '结束', '结束时间'],
    duration: ['duration', 'minutes', '时长', '持续时间'],
    rating: ['rating', '评分'],
    tags: ['tags', 'tag', '标签'],
  };
  const aliases = (aliasesByCanonical[canonical] || [canonical, customName]).map(fieldToken);
  return list.find(field => templateFieldTokens(field).some(token => aliases.includes(token))) || null;
}

function normalizeExcelCommitValue(field: TemplateField | null, canonicalField: string, value: unknown): unknown {
  if (field) return normalizeTemplateFieldValue(field, value);
  if (value === undefined || value === null) return '';
  if (canonicalField === 'duration' || canonicalField === 'rating') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
  }
  if (canonicalField === 'tags') {
    if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
    return String(value)
      .split(/[,，\n]/)
      .map(part => part.trim())
      .filter(Boolean);
  }
  return value;
}

function writeAliasIfMeaningful(data: Record<string, unknown>, key: string, value: unknown): void {
  if (!key) return;
  data[key] = value;
}

function writeExcelCommitValueToFormData(
  formData: Record<string, unknown>,
  field: TemplateField | null,
  canonicalField: string,
  value: unknown,
): Record<string, unknown> {
  const next = { ...formData };
  const normalizedValue = normalizeExcelCommitValue(field, canonicalField, value);
  const key = field?.key || canonicalField;

  writeAliasIfMeaningful(next, key, normalizedValue);
  if (field?.label && field.label !== key) writeAliasIfMeaningful(next, field.label, normalizedValue);

  if (canonicalField === 'title') {
    next.title = normalizedValue;
    if (!field) next['标题'] = normalizedValue;
  }
  if (canonicalField === 'content' || canonicalField === 'editableText') {
    next.content = normalizedValue;
    next.editableText = normalizedValue;
    if (!field) next['内容'] = normalizedValue;
  }
  if (canonicalField === 'date') next.date = normalizedValue;
  if (canonicalField === 'startTime') next.startTime = normalizedValue;
  if (canonicalField === 'endTime') next.endTime = normalizedValue;
  if (canonicalField === 'duration') next.duration = normalizedValue;
  if (canonicalField === 'rating') next.rating = normalizedValue;
  if (canonicalField === 'tags') next.tags = normalizedValue;

  return next;
}

export async function commitExcelCellFromView(params: CommitExcelCellFromViewParams): Promise<CommitExcelCellFromViewResult> {
  const canonicalField = normalizeEditableFieldKey(params.canonicalField || params.field);
  const policy = getFieldEditPolicy(canonicalField, params.oldValue);

  if (!isExcelInlineCommitSupported(canonicalField)) {
    const message = '当前 Excel MVP 只开放安全字段：content/title/date/time/duration/rating/tags 与自定义 extra 字段；路径、文件、派生字段保持只读。';
    params.uiPort.notice(message);
    return { ok: false, message };
  }

  if (policy.editorKind === 'path') {
    const message = '路径类字段不能在 Excel 视图中修改，请通过完整编辑或配置入口处理。';
    params.uiPort.notice(message);
    return { ok: false, message };
  }

  if (!policy.editable || policy.commitMode !== 'inline') {
    const message = policy.reason || '该字段不可内联编辑';
    params.uiPort.notice(message);
    return { ok: false, message };
  }

  const prepared = params.useCases.recordInput.prepareEditRecord({
    item: params.item,
    blockId: params.item.templateId || params.item.categoryKey || '',
    themeId: null,
    source: 'quickinput',
  });

  if (!prepared.blockId) {
    const message = '无法定位该记录的编辑模板，已取消单元格保存。';
    params.uiPort.notice(message);
    return { ok: false, message };
  }

  const blockId = prepared.blockId;
  const templateField = resolveTemplateFieldForExcelCommit(prepared.template?.fields as TemplateField[] | undefined, canonicalField);
  if (templateField && getTemplateFieldInputType(templateField).toLowerCase().includes('path')) {
    const message = '路径类模板字段不能在 Excel 视图中修改。';
    params.uiPort.notice(message);
    return { ok: false, message };
  }

  const formData = writeExcelCommitValueToFormData(
    prepared.initialFormData || {},
    templateField,
    canonicalField,
    params.nextValue,
  );

  const { ok, message } = await runUiRecordAction(
    () => params.useCases.recordInput.submitUpdateRecord({
      item: params.item,
      blockId,
      themeId: prepared.themeId,
      formData,
      source: 'quickinput',
    }),
    {
      uiPort: params.uiPort,
      failureMessage: '保存单元格失败',
      successNotice: params.showSuccessNotice,
      successFallback: '✅ 已保存单元格',
    },
  );

  if (ok) {
    return {
      ok: true,
      message,
      normalizedValue: normalizeExcelCommitValue(templateField, canonicalField, params.nextValue),
    };
  }

  return { ok: false, message };
}
