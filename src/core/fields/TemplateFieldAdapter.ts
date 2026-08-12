// src/core/fields/TemplateFieldAdapter.ts
import type { RecordCaptureTemplate, TemplateField } from '@/core/recordInput/CaptureTemplate';
import type { FieldInputType, FieldSemantic } from './FieldTypes';
import { normalizeHierarchyPath, splitHierarchyPath } from './pathSemantics';
import { normalizeGoalPath } from '@/core/goal/path';
import { findMatchingOption, isOptionLikeValue, readOptionText, type OptionLikeValue } from '@/core/semantics/option';
export type { OptionLikeValue } from '@/core/semantics/option';
import { parseTagList } from './tagSemantics';
import { normalizeImageValue } from './imageSemantics';
import { isMultiValueTemplateFieldType } from './TemplateFieldSanitizer';
import {
  normalizeFieldToken,
  templateFieldMatchesAliases,
} from './fieldTokenSemantics';


const KNOWN_SEMANTICS = new Set<FieldSemantic>([
  'none',
  'id',
  'recordType',
  'title',
  'body',
  'categoryPath',
  'themePath',
  'tags',
  'goalId',
  'goalPath',
  'cycleId',
  'coreBlock',
  'recordSubtype',
  'status',
  'date',
  'startTime',
  'endTime',
  'duration',
  'rating',
  'image',
  'icon',
  'priority',
  'recurrence',
  'period',
  'filePath',
  'fileName',
  'fileFolder',
  'heading',
]);

function isKnownSemantic(value: unknown): value is FieldSemantic {
  return KNOWN_SEMANTICS.has(value as FieldSemantic);
}

export function templateFieldMatches(field: Partial<TemplateField> | null | undefined, aliases: string[]): boolean {
  return templateFieldMatchesAliases(field, aliases);
}

export function getTemplateFieldSemantic(field: Partial<TemplateField> | null | undefined): FieldSemantic {
  if (!field) return 'none';
  if (isKnownSemantic(field.semantic)) return field.semantic;
  if (isKnownSemantic(field.semanticType)) return field.semanticType;

  const semanticType = normalizeFieldToken(field.semanticType);
  if (semanticType === 'ratingpair') return 'rating';
  if (semanticType === 'path') {
    if (templateFieldMatches(field, ['主题', 'theme', 'themePath', '完整主题', '主题路径'])) return 'themePath';
    if (templateFieldMatches(field, ['分类', '类别', '思考分类', '闪念分类', 'category', 'categoryPath', '分类路径'])) return 'categoryPath';
    return 'none';
  }

  if (templateFieldMatches(field, ['标题', 'title', '名称', 'name'])) return 'title';
  if (templateFieldMatches(field, ['正文', '内容', '任务内容', '记录内容', 'body', 'content', 'text'])) return 'body';
  if (templateFieldMatches(field, ['主题', 'theme', 'themePath', '完整主题', '主题路径'])) return 'themePath';
  if (templateFieldMatches(field, ['分类', '类别', '思考分类', '闪念分类', 'category', 'categoryPath', '分类路径'])) return 'categoryPath';
  if (templateFieldMatches(field, ['标签', 'tag', 'tags'])) return 'tags';
  if (templateFieldMatches(field, ['目标ID', 'goalId'])) return 'goalId';
  if (templateFieldMatches(field, ['目标路径', 'goalPath'])) return 'goalPath';
  if (templateFieldMatches(field, ['周期ID', 'cycleId'])) return 'cycleId';
  if (templateFieldMatches(field, ['核心Block', 'coreBlock'])) return 'coreBlock';
  if (templateFieldMatches(field, ['记录子类型', 'recordSubtype', 'subtype'])) return 'recordSubtype';
  if (templateFieldMatches(field, ['目标'])) return 'goalPath';
  if (templateFieldMatches(field, ['状态', 'status'])) return 'status';
  if (templateFieldMatches(field, ['日期', 'date'])) return 'date';
  if (templateFieldMatches(field, ['时间', '开始', '开始时间', 'time', 'start', 'startTime'])) return 'startTime';
  if (templateFieldMatches(field, ['结束', '结束时间', 'end', 'endTime'])) return 'endTime';
  if (templateFieldMatches(field, ['时长', 'duration', 'minutes', '持续时间'])) return 'duration';
  if (templateFieldMatches(field, ['评分', 'rating'])) return 'rating';
  if (templateFieldMatches(field, ['图片', 'image', 'pic', 'photo', '评图', 'pintu'])) return 'image';
  if (templateFieldMatches(field, ['图标', 'icon'])) return 'icon';
  if (templateFieldMatches(field, ['重复', 'recurrence', 'repeat'])) return 'recurrence';
  if (templateFieldMatches(field, ['周期', '粒度', 'period'])) return 'period';
  return 'none';
}

export function getTemplateFieldInputType(field: Partial<TemplateField> | null | undefined): FieldInputType {
  const type = field?.type as FieldInputType | undefined;
  if (type) return type;
  const semantic = getTemplateFieldSemantic(field);
  if (semantic === 'body') return 'textarea';
  if (semantic === 'themePath' || semantic === 'categoryPath' || semantic === 'goalPath') return 'hierarchicalSingleSelect';
  if (semantic === 'tags') return 'multiTag';
  if (semantic === 'image') return 'image';
  if (semantic === 'rating') return 'rating';
  if (semantic === 'date') return 'date';
  if (semantic === 'startTime' || semantic === 'endTime') return 'time';
  if (semantic === 'duration') return 'number';
  return 'text';
}

export function isOptionObject(value: unknown): value is OptionLikeValue {
  return isOptionLikeValue(value);
}

export function isTemplateRatingPairField(field: Partial<TemplateField> | null | undefined): boolean {
  return normalizeFieldToken(field?.semanticType) === 'ratingpair';
}

export function isTemplateOptionField(field: Partial<TemplateField> | null | undefined): boolean {
  const inputType = getTemplateFieldInputType(field);
  return ['select', 'radio', 'singleSelect', 'multiSelect', 'path', 'hierarchicalSingleSelect', 'multiPath', 'tag', 'multiTag', 'rating'].includes(inputType);
}

export function isTemplatePathField(field: Partial<TemplateField> | null | undefined): boolean {
  const inputType = getTemplateFieldInputType(field);
  const semantic = getTemplateFieldSemantic(field);
  return inputType === 'path' || inputType === 'hierarchicalSingleSelect' || inputType === 'multiPath' || semantic === 'themePath' || semantic === 'categoryPath' || semantic === 'goalPath' || normalizeFieldToken(field?.semanticType) === 'path';
}

export function isTemplateTagField(field: Partial<TemplateField> | null | undefined): boolean {
  const inputType = getTemplateFieldInputType(field);
  const semantic = getTemplateFieldSemantic(field);
  return inputType === 'tag' || inputType === 'multiTag' || semantic === 'tags';
}

export function isTemplateImageField(field: Partial<TemplateField> | null | undefined): boolean {
  const inputType = getTemplateFieldInputType(field);
  return inputType === 'image' || inputType === 'multiImage' || getTemplateFieldSemantic(field) === 'image';
}

export function isTemplateMultiValueField(field: Partial<TemplateField> | null | undefined): boolean {
  const inputType = getTemplateFieldInputType(field);
  // 新配置中，值数量只由字段类型决定；cardinality 只作为旧配置兼容兜底。
  return isMultiValueTemplateFieldType(inputType) || field?.cardinality === 'multi';
}

function splitMultiText(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(splitMultiText);
  return String(value ?? '')
    .split(/[,，\n]/)
    .map(part => part.trim())
    .filter(Boolean);
}

function normalizeOptionObject(field: Partial<TemplateField>, rawValue: OptionLikeValue): OptionLikeValue {
  const text = readOptionText(rawValue);
  if (isTemplatePathField(field)) {
    const normalized = normalizeHierarchyPath(text.value || text.label);
    return normalized ? { value: normalized, label: text.label || normalized.split('/').pop() || normalized } : rawValue;
  }
  return { value: rawValue.value ?? text.value, label: rawValue.label ?? text.label ?? rawValue.value };
}

function normalizeSingleRawValue(field: Partial<TemplateField>, rawValue: unknown): unknown {
  if (rawValue === undefined || rawValue === null || rawValue === '') return rawValue;
  if (isOptionObject(rawValue)) return normalizeOptionObject(field, rawValue);

  if (isTemplateTagField(field)) {
    return parseTagList(rawValue).join(', ');
  }

  if (isTemplateImageField(field)) {
    return normalizeImageValue(rawValue)?.src ?? rawValue;
  }

  if (isTemplatePathField(field)) {
    const normalized = normalizeHierarchyPath(rawValue);
    if (!normalized) return rawValue;
    const matched = findMatchingOption(field.options, rawValue, { normalize: normalizeHierarchyPath, matchLeaf: true });
    return {
      value: normalized,
      label: matched?.label || normalized.split('/').pop() || normalized,
    };
  }

  if (isTemplateOptionField(field)) {
    const rawString = String(rawValue);
    const matched = findMatchingOption(field.options, rawValue);
    if (matched) return { value: matched.value, label: matched.label || matched.value };
    if (getTemplateFieldInputType(field) === 'rating' || isTemplateRatingPairField(field)) return { value: rawString, label: rawString };
  }

  return rawValue;
}

export function normalizeTemplateFieldValue(field: Partial<TemplateField>, rawValue: unknown): unknown {
  if (rawValue === undefined || rawValue === null || rawValue === '') return rawValue;

  if (isTemplateMultiValueField(field)) {
    if (isTemplateTagField(field)) return parseTagList(rawValue);
    if (isTemplateImageField(field)) {
      return splitMultiText(rawValue)
        .map(value => normalizeImageValue(value)?.src)
        .filter((src): src is string => !!src);
    }
    if (isTemplatePathField(field)) {
      return splitMultiText(rawValue)
        .map(value => normalizeHierarchyPath(value))
        .filter((value): value is string => !!value);
    }
    return splitMultiText(rawValue);
  }

  return normalizeSingleRawValue(field, rawValue);
}

function singleTemplateValueToString(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.map(singleTemplateValueToString).filter(Boolean).join(', ');
  if (isOptionObject(value)) return String(value.value ?? value.label ?? '').trim();
  if (typeof value === 'object' && value && 'src' in (value as any)) return String((value as any).src ?? '').trim();
  return String(value).trim();
}

function setIfMeaningful(data: Record<string, unknown>, key: string, value: unknown): void {
  if (value === undefined || value === null) return;
  if (typeof value === 'string' && !value.trim()) return;
  if (Array.isArray(value) && value.length === 0) return;
  data[key] = value;
}

function applyCoreTemplateAliases(data: Record<string, unknown>, field: Partial<TemplateField>, value: unknown): void {
  const semantic = getTemplateFieldSemantic(field);
  if (semantic === 'themePath') {
    const path = normalizeHierarchyPath(singleTemplateValueToString(value));
    if (!path) return;
    const parts = splitHierarchyPath(path);
    data.themePath = path;
    data.rootTheme = parts.root || '';
    data.leafTheme = parts.leaf || '';
    data.theme = {
      ...(data.theme && typeof data.theme === 'object' ? data.theme as Record<string, unknown> : {}),
      path,
      root: parts.root || '',
      leaf: parts.leaf || '',
    };
    return;
  }

  if (semantic === 'categoryPath') {
    const path = normalizeHierarchyPath(singleTemplateValueToString(value));
    if (!path) return;
    const parts = splitHierarchyPath(path);
    data.categoryKey = path;
    data.categoryPath = path;
    data.baseCategory = parts.root || '';
    data.rootCategory = parts.root || '';
    data.leafCategory = parts.leaf || '';
    return;
  }

  if (semantic === 'tags') {
    const tags = parseTagList(value);
    if (tags.length) data.tags = tags;
    return;
  }

  if (semantic === 'goalId') {
    const goalId = singleTemplateValueToString(value);
    if (goalId) {
      data.goalId = goalId;
    }
    return;
  }

  if (semantic === 'goalPath') {
    const path = normalizeGoalPath(singleTemplateValueToString(value));
    if (!path) return;
    const parts = splitHierarchyPath(path);
    data.goalPath = path;
    data.rootGoal = parts.root || '';
    data.leafGoal = parts.leaf || '';
    return;
  }

  if (semantic === 'cycleId') {
    const cycleId = singleTemplateValueToString(value);
    if (cycleId) data.cycleId = cycleId;
    return;
  }

  if (semantic === 'coreBlock') {
    const coreBlock = singleTemplateValueToString(value);
    if (coreBlock) data.coreBlock = coreBlock;
    return;
  }


  if (semantic === 'image') {
    if (Array.isArray(value)) {
      const images = value.map(singleTemplateValueToString).filter(Boolean);
      if (images.length) {
        data.image = images[0];
        data.images = images;
        data.pintu = images[0];
      }
      return;
    }
    const image = normalizeImageValue(value)?.src ?? singleTemplateValueToString(value);
    if (image) {
      data.image = image;
      data.pintu = image;
    }
    return;
  }

  const directKeyBySemantic: Partial<Record<FieldSemantic, string>> = {
    title: 'title',
    body: 'content',
    date: 'date',
    startTime: 'startTime',
    endTime: 'endTime',
    duration: 'duration',
    rating: 'rating',
    icon: 'icon',
    recurrence: 'recurrence',
    period: 'period',
    status: 'status',
  };
  const directKey = directKeyBySemantic[semantic];
  if (directKey) setIfMeaningful(data, directKey, value);
}

export function normalizeTemplateRenderData(template: Pick<RecordCaptureTemplate, 'fields'>, formData: Record<string, unknown>): Record<string, unknown> {
  const normalizedData: Record<string, unknown> = { ...formData };
  for (const field of template.fields || []) {
    const raw = normalizedData[field.key] ?? normalizedData[field.label || ''];
    if (raw === undefined || raw === null || raw === '') continue;

    if (isTemplateRatingPairField(field)) {
      const obj = isOptionObject(raw) ? normalizeOptionObject(field, raw) : { value: raw, label: raw };
      normalizedData[field.key] = obj;
      if (field.label && field.label !== field.key) normalizedData[field.label] = obj;
      const auxKey = field.auxKey || '评图';
      if ((obj as any).value !== undefined) normalizedData[auxKey] = (obj as any).value;
      applyCoreTemplateAliases(normalizedData, field, obj);
      continue;
    }

    const normalizedValue = normalizeTemplateFieldValue(field, raw);
    normalizedData[field.key] = normalizedValue;
    if (field.label && field.label !== field.key) normalizedData[field.label] = normalizedValue;
    applyCoreTemplateAliases(normalizedData, field, normalizedValue);
  }
  return normalizedData;
}
