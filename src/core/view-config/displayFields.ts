import { normalizeEditableFieldKey } from '../fields/FieldEditPolicy';
import { isNoisyViewDisplayField, normalizeViewFieldKey } from './domainFields';

export interface NormalizeDisplayFieldsOptions {
  /** 当前可选择字段。传入后，可用于阻止添加不存在的新字段。 */
  availableFields?: readonly string[];
  /** 是否保留已经存在但暂时不在 availableFields 里的字段。默认 true，避免筛选后误删配置。 */
  includeUnknown?: boolean;
  /** 是否保留模板来源、周期ID、重复 token 等低价值系统字段。默认 false。 */
  includeNoisySystemFields?: boolean;
  /** 归一化后为空时使用的兜底字段。 */
  fallbackFields?: readonly string[];
}

function normalizeDisplayFieldKey(field: string): string {
  return normalizeEditableFieldKey(normalizeViewFieldKey(field));
}

function toNormalizedSet(fields?: readonly string[]): Set<string> | null {
  if (!fields) return null;
  return new Set(fields.map(normalizeDisplayFieldKey).filter(Boolean));
}

/**
 * 视图显示字段的唯一数组规则：去空、归一、去重、稳定顺序。
 *
 * 注意：这里管理的是 ViewInstance.fields，不是 Excel 专属配置。
 * Excel 顶部字段栏、统一视图设置弹窗都应该共用这套规则。
 */
export function normalizeDisplayFields(
  fields: readonly string[] | undefined,
  options: NormalizeDisplayFieldsOptions = {},
): string[] {
  const includeUnknown = options.includeUnknown !== false;
  const includeNoisySystemFields = options.includeNoisySystemFields === true;
  const availableSet = toNormalizedSet(options.availableFields);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const field of fields || []) {
    const key = normalizeDisplayFieldKey(field);
    if (!key || seen.has(key)) continue;
    if (!includeNoisySystemFields && isNoisyViewDisplayField(key)) continue;
    if (availableSet && !availableSet.has(key) && !includeUnknown) continue;
    seen.add(key);
    result.push(key);
  }

  if (!result.length && options.fallbackFields?.length) {
    return normalizeDisplayFields(options.fallbackFields, {
      availableFields: options.availableFields,
      includeUnknown: false,
    });
  }

  return result;
}

export function addDisplayField(
  fields: readonly string[] | undefined,
  field: string,
  options: NormalizeDisplayFieldsOptions = {},
): string[] {
  const current = normalizeDisplayFields(fields, options);
  const key = normalizeDisplayFieldKey(field);
  if (!key) return current;

  const availableSet = toNormalizedSet(options.availableFields);
  if (availableSet && !availableSet.has(key)) return current;
  if (current.includes(key)) return current;
  return [...current, key];
}

export function removeDisplayField(
  fields: readonly string[] | undefined,
  field: string,
  options: NormalizeDisplayFieldsOptions = {},
): string[] {
  const key = normalizeDisplayFieldKey(field);
  return normalizeDisplayFields(fields, options).filter(item => item !== key);
}

export function moveDisplayField(
  fields: readonly string[] | undefined,
  fromIndex: number,
  toIndex: number,
  options: NormalizeDisplayFieldsOptions = {},
): string[] {
  const current = normalizeDisplayFields(fields, options);
  if (fromIndex === toIndex) return current;
  if (fromIndex < 0 || fromIndex >= current.length) return current;
  if (toIndex < 0 || toIndex >= current.length) return current;

  const next = [...current];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function replaceDisplayField(
  fields: readonly string[] | undefined,
  fromField: string,
  toField: string,
  options: NormalizeDisplayFieldsOptions = {},
): string[] {
  const fromKey = normalizeDisplayFieldKey(fromField);
  const toKey = normalizeDisplayFieldKey(toField);
  if (!fromKey || !toKey || fromKey === toKey) return normalizeDisplayFields(fields, options);

  const availableSet = toNormalizedSet(options.availableFields);
  if (availableSet && !availableSet.has(toKey)) return normalizeDisplayFields(fields, options);

  const current = normalizeDisplayFields(fields, options);
  const fromIndex = current.indexOf(fromKey);
  if (fromIndex < 0 || current.includes(toKey)) return current;

  const next = [...current];
  next[fromIndex] = toKey;
  return normalizeDisplayFields(next, options);
}
