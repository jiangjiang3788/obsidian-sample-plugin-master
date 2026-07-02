import type { BlockTemplate, Item, TemplateField } from '@/core/types/schema';
import type { ParsedRecordSnapshot } from '@/core/types/recordSnapshot';
import { resolveFieldValue } from '@/core/fields/FieldValueResolver';
import {
  getTemplateFieldInputType,
  getTemplateFieldSemantic,
  isOptionObject,
  isTemplateRatingPairField,
  normalizeTemplateFieldValue,
} from '@/core/fields/TemplateFieldAdapter';
import { matchTemplateFieldOptionValue } from '@/core/fields/FieldBehavior';
import { decodeMarkdownFieldValue, type FieldCodecDefinition } from '@/core/records/codec/FieldValueCodec';
import { parseTagList } from '@/core/fields/tagSemantics';
import { normalizeFieldToken } from '@/core/fields/fieldTokenSemantics';
import { normalizeImageValue } from '@/core/fields/imageSemantics';
import { findMatchingOption, readOptionText } from '@/core/semantics/option';
import { getHierarchyPathLeaf, normalizeHierarchyPathValue } from '@/core/semantics/path';

function isPresent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function fieldCodecDefinition(field: TemplateField): FieldCodecDefinition {
  const inputType = getTemplateFieldInputType(field);
  const semantic = getTemplateFieldSemantic(field);
  return {
    type: semantic === 'tags' || semantic === 'goals'
      ? 'tags'
      : semantic === 'themePath' || semantic === 'categoryPath' || inputType === 'path' || inputType === 'multiPath'
        ? 'path'
        : semantic === 'image' || inputType === 'image' || inputType === 'multiImage'
          ? 'image'
          : semantic === 'rating' || inputType === 'number'
            ? 'number'
            : 'string',
    inputType,
    semantic,
    cardinality: field.cardinality || (['multiSelect', 'multiPath', 'multiTag', 'multiImage'].includes(inputType) ? 'multi' : 'single'),
    hierarchical: field.hierarchical || semantic === 'themePath' || semantic === 'categoryPath' || semantic === 'tags' || semantic === 'goals',
  };
}

function readExtraByAlias(item: Item, aliases: unknown[]): unknown {
  const entries = Object.entries(item.extra || {});
  for (const alias of aliases) {
    const rawAlias = String(alias ?? '').trim();
    if (!rawAlias) continue;
    if (item.extra && Object.prototype.hasOwnProperty.call(item.extra, rawAlias)) return item.extra[rawAlias as keyof typeof item.extra];
    const lower = normalizeFieldToken(rawAlias);
    const matched = entries.find(([key]) => normalizeFieldToken(key) === lower);
    if (matched) return matched[1];
  }
  return undefined;
}

function readPeriodFromLegacyCategory(field: TemplateField, item: Item, snapshot: ParsedRecordSnapshot): string | undefined {
  const candidates = [snapshot.semantic.categoryKey, item.categoryKey];
  const options = field.options || [];
  for (const candidate of candidates) {
    const raw = String(candidate || '').trim();
    if (!raw) continue;
    const leaf = getHierarchyPathLeaf(raw) || raw;
    const matched = findMatchingOption(options, raw, { normalize: (value) => normalizeHierarchyPathValue(value), matchLeaf: true })
      || findMatchingOption(options, leaf);
    if (matched) {
      const text = readOptionText(matched);
      return text.value || text.label || raw;
    }
  }
  return undefined;
}

function buildRatingPairOption(field: TemplateField, item: Item, snapshot: ParsedRecordSnapshot): unknown {
  const options = field.options || [];
  const score = String(item.rating ?? '');
  const image = String((item as any).image ?? item.pintu ?? item.extra?.['评图'] ?? item.extra?.['pintu'] ?? item.extra?.['图片'] ?? '');

  let matched = options.find((opt: any) => String(opt.label ?? '') === score && (!image || String(opt.value || '') === image));
  if (!matched && score) matched = findMatchingOption(options, score);
  if (!matched && image) matched = findMatchingOption(options, image);
  if (matched) {
    const text = readOptionText(matched);
    return { value: text.value, label: text.label || text.value };
  }
  if (score || image) return { value: image || score, label: score || image };
  return undefined;
}

function readSemanticFieldValue(field: TemplateField, item: Item, snapshot: ParsedRecordSnapshot): unknown {
  const semantic = getTemplateFieldSemantic(field);
  switch (semantic) {
    case 'body':
      return item.type === 'task'
        ? snapshot.semantic.editableText || snapshot.semantic.title || snapshot.semantic.content
        : snapshot.semantic.editableText || snapshot.semantic.content || snapshot.semantic.title;
    case 'title':
      // Task title historically mirrored the editable task text. Preserve that behavior so editing does not truncate tasks.
      return item.type === 'task'
        ? snapshot.semantic.editableText || snapshot.semantic.title || snapshot.semantic.content
        : snapshot.semantic.title || snapshot.semantic.editableText || snapshot.semantic.content;
    case 'date':
      return snapshot.semantic.date;
    case 'period':
      return snapshot.semantic.period || readPeriodFromLegacyCategory(field, item, snapshot);
    case 'tags':
      return parseTagList(snapshot.semantic.tags);
    case 'goals':
      return parseTagList(snapshot.semantic.goalPaths);
    case 'startTime':
      return snapshot.semantic.startTime;
    case 'endTime':
      return snapshot.semantic.endTime;
    case 'duration':
      return snapshot.semantic.duration;
    case 'themePath':
      return snapshot.semantic.themePath;
    case 'categoryPath':
      return snapshot.semantic.categoryKey;
    case 'rating':
      if (isTemplateRatingPairField(field)) return buildRatingPairOption(field, item, snapshot);
      return item.rating;
    case 'image':
      return normalizeImageValue((item as any).image ?? item.pintu ?? item.extra?.['图片'] ?? item.extra?.['image'] ?? item.extra?.['评图'] ?? item.extra?.['pintu'])?.src;
    case 'icon':
      return item.icon;
    case 'priority':
      return item.priority;
    case 'recurrence':
      return item.recurrence;
    default:
      return undefined;
  }
}

function readRegisteredOrExtraValue(field: TemplateField, item: Item): unknown {
  const aliases = [field.key, field.label, ...(field.storage?.aliases || [])];
  const byKey = field.key ? resolveFieldValue(item, field.key).value : undefined;
  if (isPresent(byKey)) return byKey;

  const byLabel = field.label ? resolveFieldValue(item, field.label).value : undefined;
  if (isPresent(byLabel)) return byLabel;

  const extraValue = readExtraByAlias(item, aliases);
  if (isPresent(extraValue)) return extraValue;

  const directKey = field.key ? (item as any)[field.key] : undefined;
  if (isPresent(directKey)) return directKey;
  const directLabel = field.label ? (item as any)[field.label] : undefined;
  if (isPresent(directLabel)) return directLabel;

  return undefined;
}
function normalizeBackfillValue(field: TemplateField, rawValue: unknown): unknown {
  if (!isPresent(rawValue)) return undefined;
  if (isTemplateRatingPairField(field) && isOptionObject(rawValue)) return rawValue;

  const decoded = decodeMarkdownFieldValue(rawValue, fieldCodecDefinition(field));
  const normalized = normalizeTemplateFieldValue(field, decoded);
  return matchTemplateFieldOptionValue(field, normalized);
}

export function resolveInitialFieldValue(input: {
  field: TemplateField;
  item: Item;
  snapshot: ParsedRecordSnapshot;
}): unknown {
  const semanticValue = readSemanticFieldValue(input.field, input.item, input.snapshot);
  if (isPresent(semanticValue)) return normalizeBackfillValue(input.field, semanticValue);

  const registeredOrExtra = readRegisteredOrExtraValue(input.field, input.item);
  if (isPresent(registeredOrExtra)) return normalizeBackfillValue(input.field, registeredOrExtra);

  return undefined;
}

export function buildInitialEditFormData(input: {
  template: Pick<BlockTemplate, 'fields'> | null | undefined;
  item: Item;
  snapshot: ParsedRecordSnapshot;
}): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const fields = input.template?.fields || [];
  for (const field of fields) {
    const value = resolveInitialFieldValue({ field, item: input.item, snapshot: input.snapshot });
    if (isPresent(value)) result[field.key] = value;
  }
  return result;
}
