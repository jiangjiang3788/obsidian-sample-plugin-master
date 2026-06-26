import { getFieldEditPolicy, getFieldLabel, normalizeEditableFieldKey, readField, type Item } from '@core/public';
import type { ExcelCellModel, ExcelColumnModel, ExcelEditorOption } from './types';

function isOptionLikeValue(value: unknown): value is { value?: unknown; label?: unknown } {
  return !!value && typeof value === 'object' && ('value' in value || 'label' in value);
}

export function formatExcelCellValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatExcelCellValue).filter(Boolean).join(', ');
  if (isOptionLikeValue(value)) return String(value.label ?? value.value ?? '');
  if (value === true) return 'true';
  if (value === false) return 'false';
  return value == null ? '' : String(value);
}

function toDateInputValue(value: unknown): string {
  const text = formatExcelCellValue(value).trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : text;
}

function toTimeInputValue(value: unknown): string {
  const text = formatExcelCellValue(value).trim();
  const match = text.match(/^(\d{1,2}:\d{2})/);
  return match ? match[1].padStart(5, '0') : text;
}

function toDateTimeInputValue(value: unknown): string {
  const text = formatExcelCellValue(value).trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
  return match ? `${match[1]}T${match[2]}` : text;
}

function isValidDateInput(value: string): boolean {
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTimeInput(value: string): boolean {
  return !value || /^\d{1,2}:\d{2}$/.test(value);
}

function isValidDateTimeInput(value: string): boolean {
  return !value || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
}

export function truncateExcelCellText(text: string, maxLength = 20): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function normalizeExcelColumnKey(field: string): string {
  return normalizeEditableFieldKey(field);
}

export function buildExcelColumns(fields: string[]): ExcelColumnModel[] {
  const seen = new Set<string>();
  const columns: ExcelColumnModel[] = [];

  for (const field of fields) {
    const key = normalizeExcelColumnKey(field);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const policy = getFieldEditPolicy(key);
    columns.push({
      key,
      canonicalField: policy.canonicalField,
      label: getFieldLabel(key) || key,
      editable: policy.editable && policy.commitMode === 'inline',
      editorKind: policy.editorKind,
      commitMode: policy.commitMode,
      dangerLevel: policy.dangerLevel,
      readonlyReason: policy.editable ? undefined : policy.reason,
    });
  }

  return columns;
}

export function buildExcelCellModel(item: Item, field: string, valueOverride?: unknown): ExcelCellModel {
  const sourceValue = readField(item, field);
  const hasOverride = valueOverride !== undefined;
  const value = hasOverride ? valueOverride : sourceValue;
  const policy = getFieldEditPolicy(field, value);
  return {
    item,
    itemId: item.id,
    field,
    canonicalField: policy.canonicalField,
    value,
    displayValue: formatExcelCellValue(value),
    editorValue: formatExcelEditorValue(value, policy.editorKind),
    policy,
  };
}

export function formatExcelEditorValue(value: unknown, editorKind: ExcelCellModel['policy']['editorKind']): string {
  if (editorKind === 'date') return toDateInputValue(value);
  if (editorKind === 'time') return toTimeInputValue(value);
  if (editorKind === 'datetime') return toDateTimeInputValue(value);
  if (editorKind === 'boolean') return value === true ? 'true' : value === false ? 'false' : formatExcelCellValue(value);
  if (editorKind === 'select' && isOptionLikeValue(value)) return String(value.value ?? value.label ?? '');
  return formatExcelCellValue(value);
}

export function getExcelEditorOptions(cell: ExcelCellModel): ExcelEditorOption[] {
  if (cell.policy.editorKind === 'boolean') {
    return [
      { value: '', label: '空' },
      { value: 'true', label: '是' },
      { value: 'false', label: '否' },
    ];
  }

  const options = cell.policy.definition?.options;
  if (!Array.isArray(options) || !options.length) {
    return cell.editorValue
      ? [{ value: cell.editorValue, label: cell.displayValue || cell.editorValue }]
      : [{ value: '', label: '空' }];
  }

  const normalized = options
    .map(option => ({
      value: String(option?.value ?? ''),
      label: String(option?.label ?? option?.value ?? ''),
    }))
    .filter(option => option.value || option.label);

  if (cell.editorValue && !normalized.some(option => option.value === cell.editorValue)) {
    return [{ value: cell.editorValue, label: cell.displayValue || cell.editorValue }, ...normalized];
  }
  return normalized;
}

export function validateExcelEditorValue(cell: ExcelCellModel, editorValue: string): string | null {
  const trimmed = editorValue.trim();
  switch (cell.policy.editorKind) {
    case 'number':
    case 'rating':
      return trimmed && !Number.isFinite(Number(trimmed)) ? '请输入有效数字' : null;
    case 'date':
      return isValidDateInput(trimmed) ? null : '日期格式应为 YYYY-MM-DD';
    case 'time':
      return isValidTimeInput(trimmed) ? null : '时间格式应为 HH:mm';
    case 'datetime':
      return isValidDateTimeInput(trimmed) ? null : '日期时间格式应为 YYYY-MM-DDTHH:mm';
    case 'select': {
      const options = getExcelEditorOptions(cell);
      return options.length && trimmed && !options.some(option => option.value === trimmed) ? '请选择有效选项' : null;
    }
    default:
      return null;
  }
}

export function parseExcelEditorValue(cell: ExcelCellModel, editorValue: string): unknown {
  const raw = editorValue;
  const trimmed = raw.trim();

  switch (cell.policy.editorKind) {
    case 'number':
    case 'rating': {
      if (!trimmed) return null;
      const numeric = Number(trimmed);
      return Number.isFinite(numeric) ? numeric : raw;
    }
    case 'boolean': {
      const lower = trimmed.toLowerCase();
      if (['true', '1', 'yes', 'y', '是'].includes(lower)) return true;
      if (['false', '0', 'no', 'n', '否'].includes(lower)) return false;
      return null;
    }
    case 'date':
    case 'time':
    case 'datetime':
    case 'select':
      return trimmed;
    case 'tags':
      return trimmed
        .split(/[,，\n]/)
        .map(part => part.trim())
        .filter(Boolean);
    default:
      return raw;
  }
}

export function areExcelCellValuesEqual(left: unknown, right: unknown): boolean {
  return formatExcelCellValue(left) === formatExcelCellValue(right);
}
