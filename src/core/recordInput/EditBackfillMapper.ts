import type { RecordCaptureTemplate, TemplateField } from '@/core/recordInput/CaptureTemplate';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { ParsedRecordSnapshot } from '@/core/types/recordSnapshot';
import { resolveFieldValue } from '@/core/fields/FieldValueResolver';
import { formatTaskRecurrence } from '@/core/records/task/taskRecurrence';
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
    valueType: semantic === 'tags'
      ? 'tags'
      : semantic === 'goalPath' || inputType === 'path' || inputType === 'multiPath'
        ? 'path'
        : semantic === 'image' || inputType === 'image' || inputType === 'multiImage'
          ? 'image'
          : semantic === 'rating' || inputType === 'number'
            ? 'number'
            : 'string',
    inputType,
    semantic,
    cardinality: field.cardinality || (['multiSelect', 'multiPath', 'multiTag', 'multiImage'].includes(inputType) ? 'multi' : 'single'),
    hierarchical: field.hierarchical || semantic === 'goalPath' || semantic === 'tags',
  };
}

function readExtraByAlias(item: RecordViewItem, aliases: unknown[]): unknown {
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

function buildRatingPairOption(field: TemplateField, item: RecordViewItem, snapshot: ParsedRecordSnapshot): unknown {
  const options = field.options || [];
  const score = String(item.rating ?? '');
  const image = String((item as any).image ?? item.extra?.['图片'] ?? item.extra?.['image'] ?? '');

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

function readSemanticFieldValue(field: TemplateField, item: RecordViewItem, snapshot: ParsedRecordSnapshot): unknown {
  const semantic = getTemplateFieldSemantic(field);
  switch (semantic) {
    case 'body':
      return item.recordType === 'task'
        ? snapshot.semantic.editableText || snapshot.semantic.title || snapshot.semantic.content
        : snapshot.semantic.editableText || snapshot.semantic.content || snapshot.semantic.title;
    case 'title':
      // Task title mirrors canonical editable content so editing does not truncate the record.
      return item.recordType === 'task'
        ? snapshot.semantic.editableText || snapshot.semantic.title || snapshot.semantic.content
        : snapshot.semantic.title || snapshot.semantic.editableText || snapshot.semantic.content;
    case 'date':
      return snapshot.semantic.date;
    case 'period':
      return snapshot.semantic.period;
    case 'tags':
      return parseTagList(snapshot.semantic.tags);
    case 'goalPath':
      return snapshot.semantic.goalPath;
    case 'startTime':
      return snapshot.semantic.startTime;
    case 'endTime':
      return snapshot.semantic.endTime;
    case 'duration':
      return snapshot.semantic.duration;
    case 'rating':
      if (isTemplateRatingPairField(field)) return buildRatingPairOption(field, item, snapshot);
      return item.rating;
    case 'image':
      return normalizeImageValue((item as any).image ?? item.extra?.['图片'] ?? item.extra?.['image'])?.src;
    case 'icon':
      return item.icon;
    case 'priority':
      return item.priority;
    case 'recurrence':
      return formatTaskRecurrence(item.recurrenceInfo);
    default:
      return undefined;
  }
}

function readRegisteredOrExtraValue(field: TemplateField, item: RecordViewItem): unknown {
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
  item: RecordViewItem;
  snapshot: ParsedRecordSnapshot;
}): unknown {
  const semanticValue = readSemanticFieldValue(input.field, input.item, input.snapshot);
  if (isPresent(semanticValue)) return normalizeBackfillValue(input.field, semanticValue);

  const registeredOrExtra = readRegisteredOrExtraValue(input.field, input.item);
  if (isPresent(registeredOrExtra)) return normalizeBackfillValue(input.field, registeredOrExtra);

  return undefined;
}

export function buildInitialEditFormData(input: {
  template: Pick<RecordCaptureTemplate, 'fields'> | null | undefined;
  item: RecordViewItem;
  snapshot: ParsedRecordSnapshot;
}): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const fields = input.template?.fields || [];
  for (const field of fields) {
    const value = resolveInitialFieldValue({ field, item: input.item, snapshot: input.snapshot });
    if (isPresent(value)) result[field.key] = value;
  }

  // Task lifecycle/series identity is domain state, not editable form state.
  // Preserve it as hidden context so a normal content edit cannot reopen a task
  // or detach a recurring instance from its TaskSeries.
  if (input.item.recordType === 'task') {
    if (isPresent(input.item.status)) result.status = input.item.status;
    if (isPresent(input.item.seriesId)) result.seriesId = input.item.seriesId;
    // Legacy/manual actual ranges remain compatibility facts until explicitly edited
    // through Timeline. Ordinary planning edits must not silently convert them into
    // scheduledAt or delete them while replacing the Record block.
    if (isPresent(input.item.startAt)) result.startAt = input.item.startAt;
    if (isPresent(input.item.endAt)) result.endAt = input.item.endAt;
    if (isPresent(input.item.completedAt)) result.completedAt = input.item.completedAt;
    if (isPresent(input.item.cancelledAt)) result.cancelledAt = input.item.cancelledAt;
    if (isPresent(input.item.skippedAt)) result.skippedAt = input.item.skippedAt;
  }
  return result;
}
