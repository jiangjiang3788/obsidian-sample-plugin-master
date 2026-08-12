import type { TemplateField } from '@/core/recordInput/CaptureTemplate';
import { isSafeMarkdownFieldKey, resolveCaptureFieldSchema } from '@/core/fields/CaptureFieldResolver';
import { getTemplateFieldSemantic } from '@/core/fields/TemplateFieldAdapter';
import { normalizeImageValue } from '@/core/fields/imageSemantics';
import type { RecordCoreBlock, RecordFieldContract } from './schema/types';
import { getRecordFieldContract, requireRecordSchemaDefinition } from './schema/registry';

export interface RecordDraft {
  coreBlock: RecordCoreBlock;
  /** Insertion order is meaningful for generic/custom fields and follows the RecordTemplate. */
  fields: Record<string, unknown>;
}

function nonEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.some(nonEmpty);
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function optionParts(value: unknown): { value: unknown; label: unknown } {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    return { value: row.value ?? row.id ?? row.label, label: row.label ?? row.value ?? row.id };
  }
  return { value, label: value };
}

function first(renderData: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const key of keys) {
    const value = renderData[key];
    if (nonEmpty(value)) return value;
  }
  return undefined;
}

function themeValue(renderData: Record<string, unknown>, key: 'path' | 'icon'): unknown {
  const theme = renderData.theme;
  if (!theme || typeof theme !== 'object' || Array.isArray(theme)) return undefined;
  return (theme as Record<string, unknown>)[key];
}

function normalizeThoughtSubtype(raw: unknown): string | undefined {
  const parts = optionParts(raw);
  const text = String(parts.value ?? parts.label ?? '').trim();
  if (!text) return undefined;
  const pathParts = text.split('/').map(part => part.trim()).filter(Boolean);
  const leaf = pathParts.length ? pathParts[pathParts.length - 1] : text;
  if (leaf === '感受' || leaf === '思考') return leaf;
  return undefined;
}

function normalizeFieldValue(field: RecordFieldContract, raw: unknown): unknown {
  if (!nonEmpty(raw)) return undefined;
  const option = optionParts(raw);
  const scalar = option.value;

  if (field.valueType === 'number') {
    const value = typeof scalar === 'number' ? scalar : Number(String(scalar ?? '').trim());
    return Number.isFinite(value) ? value : undefined;
  }
  if (field.valueType === 'boolean') {
    if (typeof scalar === 'boolean') return scalar;
    const text = String(scalar ?? '').trim().toLowerCase();
    if (['true', '1', 'yes'].includes(text)) return true;
    if (['false', '0', 'no'].includes(text)) return false;
    return undefined;
  }
  if (field.valueType === 'tags') {
    if (Array.isArray(raw)) return raw.map(value => String(optionParts(value).value ?? '').trim()).filter(Boolean);
    return String(scalar ?? '').split(/[,，\n]/).map(value => value.trim()).filter(Boolean);
  }

  const text = String(scalar ?? '').trim();
  if (!text) return undefined;
  if (field.allowedValues?.length && !field.allowedValues.includes(text)) return undefined;
  return text;
}

function normalizeCustomValue(field: TemplateField, raw: unknown): unknown {
  if (!nonEmpty(raw)) return undefined;
  const schema = resolveCaptureFieldSchema(field);
  const isMulti = schema.cardinality === 'multi';
  if (isMulti) {
    const values = Array.isArray(raw) ? raw : String(raw).split(/[,，\n]/);
    if (schema.valueType === 'image') {
      return values.map(value => normalizeImageValue(value)?.src).filter((value): value is string => Boolean(value));
    }
    return values.map(value => String(optionParts(value).value ?? '').trim()).filter(Boolean);
  }
  const option = optionParts(raw);
  const scalar = option.value;
  switch (schema.valueType) {
    case 'number': {
      const value = typeof scalar === 'number' ? scalar : Number(String(scalar ?? '').trim());
      return Number.isFinite(value) ? value : undefined;
    }
    case 'boolean': {
      if (typeof scalar === 'boolean') return scalar;
      const text = String(scalar ?? '').trim().toLowerCase();
      if (['true', '1', 'yes'].includes(text)) return true;
      if (['false', '0', 'no'].includes(text)) return false;
      return undefined;
    }
    case 'image':
      return normalizeImageValue(raw)?.src;
    default: {
      const text = String(scalar ?? '').trim();
      return text || undefined;
    }
  }
}

function candidateForField(
  coreBlock: RecordCoreBlock,
  field: RecordFieldContract,
  renderData: Record<string, unknown>,
): unknown {
  switch (field.key) {
    case '目标ID':
      return first(renderData, ['目标ID', 'goalId']);
    case '目标': {
      const explicit = first(renderData, ['目标', 'goalPath']);
      if (nonEmpty(explicit)) return explicit;
      const paths = renderData.goalPaths;
      return Array.isArray(paths) ? paths[0] : undefined;
    }
    case '日期':
      return first(renderData, ['日期', 'date']);
    case '主题':
      return first(renderData, ['主题', 'themePath']) ?? themeValue(renderData, 'path');
    case '内容':
      return first(renderData, ['内容', 'content', '正文', 'title', '阻碍', '里程碑', '任务内容']);
    case '图标':
      return first(renderData, ['图标', 'icon']) ?? themeValue(renderData, 'icon');
    case '标签':
      return first(renderData, ['标签', 'tags', 'tag']);
    case '记录子类型':
      if (coreBlock === 'thought') {
        return normalizeThoughtSubtype(first(renderData, ['记录子类型', 'recordSubtype', 'subtype', '分类', 'categoryKey', 'categoryPath']));
      }
      return first(renderData, ['记录子类型', 'recordSubtype', 'subtype']);
    case '周期粒度': {
      const explicit = first(renderData, ['周期粒度', 'periodGranularity', 'goalGranularity']);
      if (nonEmpty(explicit)) return explicit;
      const period = renderData.period;
      return period && typeof period === 'object' && !Array.isArray(period)
        ? (period as Record<string, unknown>).granularity
        : undefined;
    }
    case '评分': {
      const raw = first(renderData, ['评分', 'rating']);
      const option = optionParts(raw);
      return option.label;
    }
    case '图片': {
      const explicit = first(renderData, ['图片', 'image', '评图', 'pintu']);
      if (nonEmpty(explicit)) return explicit;
      const rating = first(renderData, ['评分', 'rating']);
      return optionParts(rating).value;
    }
    default:
      return first(renderData, [field.key, ...(field.aliases || [])]);
  }
}

function contractForCaptureField(coreBlock: RecordCoreBlock, field: TemplateField): RecordFieldContract | null {
  for (const token of [field.key, field.label, ...(field.aliases || [])]) {
    const contract = getRecordFieldContract(coreBlock, token);
    if (contract) return contract;
  }
  const semantic = getTemplateFieldSemantic(field);
  const keyBySemantic: Partial<Record<typeof semantic, string>> = {
    body: '内容', themePath: '主题', tags: '标签', goalId: '目标ID', goalPath: '目标', goals: '目标',
    date: '日期', recordSubtype: '记录子类型', rating: '评分', image: '图片', icon: '图标', period: '周期粒度',
  };
  if (semantic === 'categoryPath' && coreBlock === 'thought') return getRecordFieldContract(coreBlock, '分类');
  const key = keyBySemantic[semantic];
  return key ? getRecordFieldContract(coreBlock, key) : null;
}

function targetContract(coreBlock: RecordCoreBlock, contract: RecordFieldContract): RecordFieldContract | null {
  if (contract.persistence === 'target' || contract.persistence === 'omit-default') return contract;
  if (contract.persistence === 'transitional' && contract.targetKey) return getRecordFieldContract(coreBlock, contract.targetKey);
  return null;
}

function putCanonical(
  fields: Record<string, unknown>,
  coreBlock: RecordCoreBlock,
  contract: RecordFieldContract | null,
  renderData: Record<string, unknown>,
): void {
  if (!contract || contract.role === 'identity') return;
  const value = normalizeFieldValue(contract, candidateForField(coreBlock, contract, renderData));
  if (!nonEmpty(value)) return;
  if (contract.persistence === 'omit-default' && contract.defaultValue !== undefined && value === contract.defaultValue) return;
  fields[contract.key] = value;
}

/**
 * User-defined fields that are not part of the system Record contract.
 * They persist as ordinary KV fields and are parsed back into `extra`.
 */
export function buildCustomCaptureFields(
  coreBlock: RecordCoreBlock,
  renderData: Record<string, unknown>,
  captureFields: readonly TemplateField[] = [],
): Record<string, unknown> {
  const schema = requireRecordSchemaDefinition(coreBlock);
  if (!schema.capabilities.customFields) return {};
  const fields: Record<string, unknown> = {};
  for (const field of captureFields) {
    if (contractForCaptureField(coreBlock, field)) continue;
    const resolved = resolveCaptureFieldSchema(field);
    // A system-known field may still be enabled on a Record kind whose core contract does not own it
    // (for example 图片 on Thought). In that case Template freedom wins and the field is persisted
    // as an allowed extension while retaining the shared FieldSchema semantics.
    const markdownKey = String(resolved.storage?.markdownKey || field.label || field.key || resolved.label || '').trim();
    if (!isSafeMarkdownFieldKey(markdownKey) || ['记录ID','记录版本','核心Block'].includes(markdownKey)) continue;
    const value = normalizeCustomValue(field, first(renderData, [field.key, field.label]));
    if (nonEmpty(value)) fields[markdownKey] = value;
  }
  return fields;
}

/**
 * R5 generic Record draft builder.
 *
 * System identity/domain semantics come from RecordSchemaDefinition, while the
 * RecordTemplate controls enabled fields, order, defaults and arbitrary safe
 * custom fields. Markdown grammar remains owned solely by MarkdownRecordCodec.
 */
export function buildGenericRecordDraft(
  coreBlock: RecordCoreBlock,
  renderData: Record<string, unknown>,
  captureFields?: readonly TemplateField[],
): RecordDraft {
  const schema = requireRecordSchemaDefinition(coreBlock);
  if (schema.family !== 'generic') throw new Error(`record_draft_not_generic:${coreBlock}`);

  const fields: Record<string, unknown> = {};

  // Goal binding is structural context and remains persisted even when the form hides the Goal selector.
  putCanonical(fields, coreBlock, getRecordFieldContract(coreBlock, '目标ID'), renderData);
  putCanonical(fields, coreBlock, getRecordFieldContract(coreBlock, '目标'), renderData);
  // Period policy is template behavior rather than a visible form field.
  putCanonical(fields, coreBlock, getRecordFieldContract(coreBlock, '周期粒度'), renderData);

  // Compatibility/pure-domain call: without a RecordTemplate, project every target schema field.
  // Runtime capture always passes an explicit template field list and therefore follows Template freedom.
  if (captureFields === undefined) {
    for (const field of schema.recordFields) {
      if (field.persistence !== 'target' && field.persistence !== 'omit-default') continue;
      putCanonical(fields, coreBlock, field, renderData);
    }
    return { coreBlock, fields };
  }

  for (const captureField of captureFields) {
    const rawContract = contractForCaptureField(coreBlock, captureField);
    const contract = rawContract ? targetContract(coreBlock, rawContract) : null;
    if (contract) {
      putCanonical(fields, coreBlock, contract, renderData);
      // Habit ratingPair carries the display image in the option value.
      if (coreBlock === 'habit' && contract.key === '评分') {
        putCanonical(fields, coreBlock, getRecordFieldContract(coreBlock, '图片'), renderData);
      }
      continue;
    }

    const custom = buildCustomCaptureFields(coreBlock, renderData, [captureField]);
    for (const [key, value] of Object.entries(custom)) fields[key] = value;
  }

  return { coreBlock, fields };
}
