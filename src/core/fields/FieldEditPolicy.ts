import type { FieldDefinition } from './FieldDefinition';
import type { FieldInputType, FieldSource } from './FieldTypes';
import { getFieldDefinition } from './FieldRegistry';
import { normalizeFieldKey } from './FieldValueResolver';

export type FieldEditorKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'date'
  | 'time'
  | 'datetime'
  | 'select'
  | 'path'
  | 'tags'
  | 'image'
  | 'rating'
  | 'readonly';

export type FieldEditDangerLevel = 'safe' | 'medium' | 'high';
export type FieldCommitMode = 'inline' | 'record-modal' | 'readonly';
export type FieldEditValueSource = FieldSource | 'unknown';

export interface FieldEditPolicy {
  /** 原始字段名，保留调用方上下文。 */
  field: string;
  /** 标准字段名；例如 status/category 会被归一到 categoryKey。 */
  canonicalField: string;
  editable: boolean;
  editorKind: FieldEditorKind;
  commitMode: FieldCommitMode;
  dangerLevel: FieldEditDangerLevel;
  valueSource: FieldEditValueSource;
  inputType?: FieldInputType;
  definition?: FieldDefinition;
  reason?: string;
}

const FIELD_ALIASES: Record<string, string> = {
  status: 'categoryKey',
  category: 'categoryKey',
  categoryPath: 'categoryKey',
};

const NEVER_INLINE_EDITABLE = new Set<string>([
  'id',
  'type',
  'created',
  'modified',
  'rawSource',
  'fullData',
  'createdDate',
  'scheduledDate',
  'doneDate',
  'cancelledDate',
  'startISO',
  'endISO',
  'periodCount',
  'file.path',
  'file.basename',
  'file.name',
  'file.folder',
  'folder',
  'header',
  'filename',
  'fileName',
]);

const DERIVED_FIELDS = new Set<string>([
  'themePath',
  'rootTheme',
  'leafTheme',
  'baseCategory',
  'leafCategory',
  'fullData',
  'startISO',
  'endISO',
  'periodCount',
]);

const MEDIUM_RISK_FIELDS = new Set<string>([
  'date',
  'startTime',
  'endTime',
  'duration',
  'categoryKey',
  'theme',
  'tags',
  'goalPaths',
]);

const HIGH_RISK_FIELDS = new Set<string>([
  'file.path',
  'file.basename',
  'file.name',
  'file.folder',
  'folder',
  'header',
]);

export function normalizeEditableFieldKey(field: string): string {
  const raw = String(field || '').trim();
  return FIELD_ALIASES[raw] || normalizeFieldKey(raw);
}

export function getFieldEditorKind(definition?: FieldDefinition, sampleValue?: unknown): FieldEditorKind {
  const inputType = definition?.inputType;
  if (inputType === 'textarea') return 'textarea';
  if (inputType === 'number') return 'number';
  if (inputType === 'boolean') return 'boolean';
  if (inputType === 'date') return 'date';
  if (inputType === 'time') return 'time';
  if (inputType === 'datetime') return 'datetime';
  if (inputType === 'select' || inputType === 'radio' || inputType === 'singleSelect' || inputType === 'multiSelect') return 'select';
  if (inputType === 'path' || inputType === 'multiPath') return 'path';
  if (inputType === 'tag' || inputType === 'multiTag') return 'tags';
  if (inputType === 'image' || inputType === 'multiImage') return 'image';
  if (inputType === 'rating') return 'rating';

  switch (definition?.type) {
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'date': return 'date';
    case 'time': return 'time';
    case 'datetime': return 'datetime';
    case 'tags': return 'tags';
    case 'path': return 'path';
    case 'image': return 'image';
    case 'file': return 'readonly';
    default:
      if (Array.isArray(sampleValue)) return 'tags';
      if (typeof sampleValue === 'number') return 'number';
      if (typeof sampleValue === 'boolean') return 'boolean';
      return 'text';
  }
}

function inferExtraDefinition(field: string, sampleValue?: unknown): FieldDefinition | undefined {
  if (!field.startsWith('extra.')) return undefined;
  const label = field.slice('extra.'.length) || field;
  const isNumber = typeof sampleValue === 'number';
  const isBoolean = typeof sampleValue === 'boolean';
  const isMulti = Array.isArray(sampleValue);
  return {
    key: field,
    label,
    type: isNumber ? 'number' : isBoolean ? 'boolean' : isMulti ? 'tags' : 'string',
    inputType: isNumber ? 'number' : isBoolean ? 'boolean' : isMulti ? 'multiTag' : 'text',
    category: 'custom',
    source: 'extra',
    cardinality: isMulti ? 'multi' : 'single',
    description: '从 Markdown 中显式未知 KV 解析出的自定义字段',
  };
}

function getDangerLevel(canonicalField: string): FieldEditDangerLevel {
  if (HIGH_RISK_FIELDS.has(canonicalField)) return 'high';
  if (MEDIUM_RISK_FIELDS.has(canonicalField)) return 'medium';
  return 'safe';
}

function readonlyPolicy(
  field: string,
  canonicalField: string,
  definition: FieldDefinition | undefined,
  reason: string,
): FieldEditPolicy {
  return {
    field,
    canonicalField,
    editable: false,
    editorKind: 'readonly',
    commitMode: 'readonly',
    dangerLevel: getDangerLevel(canonicalField),
    valueSource: definition?.source || 'unknown',
    inputType: definition?.inputType,
    definition,
    reason,
  };
}

export function getFieldEditPolicy(field: string, sampleValue?: unknown): FieldEditPolicy {
  const canonicalField = normalizeEditableFieldKey(field);
  const definition = getFieldDefinition(canonicalField) || inferExtraDefinition(canonicalField, sampleValue);

  if (NEVER_INLINE_EDITABLE.has(canonicalField)) {
    return readonlyPolicy(field, canonicalField, definition, '系统字段或文件定位字段不允许在表格内直接编辑');
  }

  if (DERIVED_FIELDS.has(canonicalField) || definition?.source === 'derived') {
    return readonlyPolicy(field, canonicalField, definition, '派生字段由其它真源字段计算，不能直接编辑');
  }

  if (definition?.source === 'file') {
    return readonlyPolicy(field, canonicalField, definition, '文件元信息字段不应通过 Excel 单元格直接编辑');
  }

  if (!definition && !canonicalField.startsWith('extra.')) {
    return readonlyPolicy(field, canonicalField, definition, '未知字段暂不开放内联编辑');
  }

  const editorKind = getFieldEditorKind(definition, sampleValue);
  if (editorKind === 'path' || definition?.type === 'path' || definition?.inputType === 'path' || definition?.inputType === 'multiPath') {
    return readonlyPolicy(field, canonicalField, definition, '路径类字段涉及文件定位、分类或主题结构，不能在 Excel 单元格内直接修改');
  }

  if (editorKind === 'readonly' || definition?.type === 'file' || definition?.inputType === 'file') {
    return readonlyPolicy(field, canonicalField, definition, '该字段类型暂不支持内联编辑');
  }

  return {
    field,
    canonicalField,
    editable: true,
    editorKind,
    commitMode: editorKind === 'image' ? 'record-modal' : 'inline',
    dangerLevel: getDangerLevel(canonicalField),
    valueSource: definition?.source || (canonicalField.startsWith('extra.') ? 'extra' : 'unknown'),
    inputType: definition?.inputType,
    definition,
    reason: undefined,
  };
}

export function canInlineEditField(field: string, sampleValue?: unknown): boolean {
  const policy = getFieldEditPolicy(field, sampleValue);
  return policy.editable && policy.commitMode === 'inline';
}
