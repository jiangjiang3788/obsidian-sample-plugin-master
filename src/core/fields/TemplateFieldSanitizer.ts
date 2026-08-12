// src/core/fields/TemplateFieldSanitizer.ts
import type { TemplateField, TemplateFieldOption } from '@/core/recordInput/CaptureTemplate';
import type { FieldInputType } from './FieldTypes';
import { makeSafeCustomFieldName } from './CoreFieldCatalog';

const USER_TEMPLATE_FIELD_TYPES: FieldInputType[] = [
  'text',
  'textarea',
  'number',
  'boolean',
  'date',
  'time',
  'datetime',
  'singleSelect',
  'multiSelect',
  'path',
  'hierarchicalSingleSelect',
  'multiPath',
  'tag',
  'multiTag',
  'image',
  'multiImage',
  'file',
  'rating',
];

const LEGACY_TYPE_ALIASES: Partial<Record<FieldInputType | string, FieldInputType>> = {
  select: 'singleSelect',
  radio: 'singleSelect',
};

const TYPE_LABELS: Record<FieldInputType, string> = {
  text: '单行文本',
  textarea: '多行文本',
  number: '数字',
  boolean: '开关',
  date: '日期',
  time: '时间',
  datetime: '日期时间',
  select: '单选',
  radio: '单选',
  singleSelect: '单选',
  multiSelect: '多选',
  path: '层级路径',
  hierarchicalSingleSelect: '层级单选',
  multiPath: '多层级路径',
  tag: '标签',
  multiTag: '多标签',
  image: '图片',
  multiImage: '多图片',
  file: '文件',
  rating: '评分',
};

const OPTION_FIELD_TYPES = new Set<FieldInputType>([
  'singleSelect',
  'multiSelect',
  'path',
  'hierarchicalSingleSelect',
  'multiPath',
  'tag',
  'multiTag',
  'rating',
]);

const DEFAULT_VALUE_FIELD_TYPES = new Set<FieldInputType>([
  'text',
  'textarea',
  'number',
  'boolean',
  'date',
  'time',
  'datetime',
  'singleSelect',
  'path',
  'hierarchicalSingleSelect',
  'tag',
  'image',
  'file',
  'rating',
]);

const MULTI_VALUE_FIELD_TYPES = new Set<FieldInputType>([
  'multiSelect',
  'multiPath',
  'multiTag',
  'multiImage',
]);

export interface TemplateFieldTypeOption {
  value: FieldInputType;
  label: string;
}

function stableFieldId(index: number): string {
  return `field_${Date.now().toString(36)}_${index}`;
}

function cleanName(value: unknown, fallback: string): string {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function cleanOptions(options: TemplateFieldOption[] | undefined): TemplateFieldOption[] | undefined {
  if (!Array.isArray(options)) return undefined;
  const cleaned = options
    .map(option => ({
      value: String(option?.value ?? '').trim(),
      label: option?.label === undefined ? undefined : String(option.label).trim(),
      icon: option?.icon === undefined ? undefined : String(option.icon).trim(),
    }))
    .filter(option => option.value || option.label || option.icon)
    .map(option => ({
      value: option.value || option.label || option.icon || '',
      ...(option.label ? { label: option.label } : {}),
      ...(option.icon ? { icon: option.icon } : {}),
    }));
  return cleaned.length ? cleaned : undefined;
}

export function normalizeTemplateFieldType(type: unknown): FieldInputType {
  const raw = String(type ?? '').trim() as FieldInputType;
  const alias = LEGACY_TYPE_ALIASES[raw];
  if (alias) return alias;
  return USER_TEMPLATE_FIELD_TYPES.includes(raw) ? raw : 'text';
}

export function getUserTemplateFieldTypeOptions(): TemplateFieldTypeOption[] {
  return USER_TEMPLATE_FIELD_TYPES.map(type => ({ value: type, label: TYPE_LABELS[type] || type }));
}

export function templateFieldTypeUsesOptions(type: unknown): boolean {
  return OPTION_FIELD_TYPES.has(normalizeTemplateFieldType(type));
}

export function templateFieldTypeSupportsDefaultValue(type: unknown): boolean {
  return DEFAULT_VALUE_FIELD_TYPES.has(normalizeTemplateFieldType(type));
}

export function isMultiValueTemplateFieldType(type: unknown): boolean {
  return MULTI_VALUE_FIELD_TYPES.has(normalizeTemplateFieldType(type));
}

/**
 * 用户自定义表单字段的持久化清洗。
 *
 * UI 层只暴露“字段名称 + 字段类型”，因此这里会删除用户不需要理解的内部字段：
 * semantic / cardinality / hierarchical / storage / aliases。
 * 分类、主题、标签等核心能力仍由插件内置字段系统提供，不通过自定义字段伪装。
 */
export function sanitizeTemplateField(field: Partial<TemplateField>, index = 1): TemplateField {
  const type = normalizeTemplateFieldType(field.type);
  const fallbackName = `新字段${index}`;
  const rawName = cleanName(field.label || field.key, fallbackName);
  const name = makeSafeCustomFieldName(rawName, fallbackName);
  const result: TemplateField = {
    id: cleanName(field.id, stableFieldId(index)),
    key: name,
    label: name,
    type,
  };

  if (templateFieldTypeSupportsDefaultValue(type) && field.defaultValue !== undefined && field.defaultValue !== null) {
    result.defaultValue = String(field.defaultValue);
  }

  if (field.required === true) {
    result.required = true;
  }

  if (templateFieldTypeUsesOptions(type)) {
    const options = cleanOptions(field.options);
    if (options) result.options = options;
  }

  if ((type === 'number' || type === 'rating') && field.min !== undefined && field.min !== null && !Number.isNaN(Number(field.min))) {
    result.min = Number(field.min);
  }
  if ((type === 'number' || type === 'rating') && field.max !== undefined && field.max !== null && !Number.isNaN(Number(field.max))) {
    result.max = Number(field.max);
  }

  return result;
}

function makeUniqueCustomFieldName(name: string, usedNames: Set<string>): string {
  const normalize = (value: string) => value.trim().replace(/\s+/g, '').toLocaleLowerCase();
  let candidate = name;
  let normalized = normalize(candidate);
  if (!usedNames.has(normalized)) {
    usedNames.add(normalized);
    return candidate;
  }
  let suffix = 2;
  do {
    candidate = `${name}${suffix}`;
    normalized = normalize(candidate);
    suffix += 1;
  } while (usedNames.has(normalized));
  usedNames.add(normalized);
  return candidate;
}

export function sanitizeTemplateFields(fields: readonly Partial<TemplateField>[] | null | undefined): TemplateField[] {
  const usedNames = new Set<string>();
  return (fields || []).map((field, index) => {
    const sanitized = sanitizeTemplateField(field, index + 1);
    const uniqueName = makeUniqueCustomFieldName(sanitized.label || sanitized.key, usedNames);
    return uniqueName === sanitized.label && uniqueName === sanitized.key
      ? sanitized
      : { ...sanitized, key: uniqueName, label: uniqueName };
  });
}

export function createCustomTemplateField(index: number, type: FieldInputType = 'text', name?: string): TemplateField {
  const label = cleanName(name, type === 'image' ? '图片' : type === 'multiImage' ? '图片组' : `新字段${index}`);
  return sanitizeTemplateField({ id: stableFieldId(index), key: label, label, type }, index);
}
