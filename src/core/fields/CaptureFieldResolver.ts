import type { TemplateField } from '@/core/recordInput/CaptureTemplate';
import type { FieldSchema } from './FieldSchema';
import { fieldValueTypeForInputType } from './FieldSchema';
import { FIELD_REGISTRY, getFieldDefinition } from './FieldRegistry';
import { getTemplateFieldSemantic } from './TemplateFieldAdapter';
import { normalizeTemplateFieldType } from './TemplateFieldSanitizer';

function findSystemField(field: Partial<TemplateField>): FieldSchema | undefined {
  for (const token of [field.key, field.label, ...(field.aliases || [])]) {
    const def = getFieldDefinition(String(token || '').trim());
    if (def) return def;
  }
  const semantic = getTemplateFieldSemantic(field);
  if (semantic !== 'none') {
    return Object.values(FIELD_REGISTRY).find(def => def.semantic === semantic);
  }
  return undefined;
}

/**
 * Resolve persisted template configuration into the one runtime FieldSchema shape.
 * Template values may override capture UX (label/input/options/default/required),
 * but never redefine the system field's semantic/source/storage identity.
 */
export function resolveCaptureFieldSchema(field: Partial<TemplateField>): FieldSchema {
  const inputType = normalizeTemplateFieldType(field.type);
  const system = findSystemField(field);
  if (system) {
    return {
      ...system,
      label: String(field.label || system.label).trim() || system.label,
      inputType,
      options: field.options || system.options,
      required: field.required ?? system.required,
      defaultValue: field.defaultValue ?? system.defaultValue,
      min: field.min ?? system.min,
      max: field.max ?? system.max,
      cardinality: field.cardinality || system.cardinality,
      hierarchical: field.hierarchical ?? system.hierarchical,
    };
  }

  const key = String(field.key || field.label || '').trim();
  const label = String(field.label || field.key || '').trim() || key;
  return {
    key: `extra.${key}`,
    label,
    valueType: fieldValueTypeForInputType(inputType),
    inputType,
    semantic: 'none',
    category: 'custom',
    source: 'extra',
    cardinality: field.cardinality || (['multiSelect','multiPath','multiTag','multiImage'].includes(inputType) ? 'multi' : 'single'),
    hierarchical: field.hierarchical,
    options: field.options,
    aliases: field.aliases,
    storage: { scope: 'extra', markdownKey: key },
    required: field.required,
    defaultValue: field.defaultValue,
    min: field.min,
    max: field.max,
    description: '由 RecordTemplate 定义的用户自定义字段。',
  };
}


export function isSafeMarkdownFieldKey(value: unknown): boolean {
  const key = String(value ?? '').trim();
  return Boolean(key && key.length <= 64 && !/[\r\n:：]/.test(key));
}

export function getCaptureFieldMarkdownKey(field: Partial<TemplateField>): string {
  const schema = resolveCaptureFieldSchema(field);
  return schema.storage?.markdownKey || (schema.source === 'extra' ? schema.key.replace(/^extra\./, '') : schema.label);
}
