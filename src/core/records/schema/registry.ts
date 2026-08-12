import { RECORD_SCHEMA_DEFINITIONS } from './definitions';
import type {
  RecordCoreBlock,
  RecordFieldContract,
  RecordSchemaDefinition,
  RecordSchemaIssue,
} from './types';

function normalizeKey(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase();
}

const BY_CORE_BLOCK = new Map<RecordCoreBlock, RecordSchemaDefinition>(
  RECORD_SCHEMA_DEFINITIONS.map(schema => [schema.coreBlock, schema]),
);
const BY_TYPE_ID = new Map<string, RecordSchemaDefinition>(
  RECORD_SCHEMA_DEFINITIONS.map(schema => [schema.id, schema]),
);

const FIELD_INDEX = new Map<RecordCoreBlock, Map<string, RecordFieldContract>>();
for (const schema of RECORD_SCHEMA_DEFINITIONS) {
  const index = new Map<string, RecordFieldContract>();
  for (const field of schema.recordFields) {
    index.set(normalizeKey(field.key), field);
    for (const alias of field.aliases || []) index.set(normalizeKey(alias), field);
  }
  FIELD_INDEX.set(schema.coreBlock, index);
}

export function isRecordCoreBlock(value: unknown): value is RecordCoreBlock {
  return BY_CORE_BLOCK.has(String(value || '').trim() as RecordCoreBlock);
}

export function getRecordSchemaDefinition(coreBlock: unknown): RecordSchemaDefinition | null {
  const key = String(coreBlock || '').trim() as RecordCoreBlock;
  return BY_CORE_BLOCK.get(key) || null;
}

export function requireRecordSchemaDefinition(coreBlock: unknown): RecordSchemaDefinition {
  const schema = getRecordSchemaDefinition(coreBlock);
  if (!schema) throw new Error(`unknown_record_schema:${String(coreBlock || '')}`);
  return schema;
}

export function getRecordSchemaDefinitionById(typeId: unknown): RecordSchemaDefinition | null {
  return BY_TYPE_ID.get(String(typeId || '').trim()) || null;
}

/** R1 compatibility name. The returned object is the authoritative R3 definition. */
export const getRecordSchemaContract = getRecordSchemaDefinition;
/** R1 compatibility name. The returned object is the authoritative R3 definition. */
export const requireRecordSchemaContract = requireRecordSchemaDefinition;

export function getRecordFieldContract(coreBlock: unknown, fieldKey: unknown): RecordFieldContract | null {
  const schema = getRecordSchemaDefinition(coreBlock);
  if (!schema) return null;
  return FIELD_INDEX.get(schema.coreBlock)?.get(normalizeKey(fieldKey)) || null;
}

export function canonicalRecordFieldKey(coreBlock: unknown, fieldKey: unknown): string | null {
  return getRecordFieldContract(coreBlock, fieldKey)?.key || null;
}

export function getTargetPersistedRecordFields(coreBlock: unknown): readonly RecordFieldContract[] {
  const schema = getRecordSchemaDefinition(coreBlock);
  if (!schema) return [];
  return schema.recordFields.filter(field => field.persistence === 'target' || field.persistence === 'omit-default');
}


export function isTargetPersistedRecordField(coreBlock: unknown, fieldKey: unknown): boolean {
  const field = getRecordFieldContract(coreBlock, fieldKey);
  return Boolean(field && (field.persistence === 'target' || field.persistence === 'omit-default'));
}

export function isSafeCustomRecordFieldKey(coreBlock: unknown, fieldKey: unknown): boolean {
  const schema = getRecordSchemaDefinition(coreBlock);
  if (!schema?.capabilities.customFields) return false;
  const key = String(fieldKey || '').trim();
  if (!key) return false;
  if (getRecordFieldContract(schema.coreBlock, key)) return false;
  return !['记录ID','recordId','id','记录版本','schemaVersion','核心Block','coreBlock'].includes(key);
}

export function inspectRecordFieldsAgainstSchema(
  coreBlock: unknown,
  fields: Record<string, unknown>,
): RecordSchemaIssue[] {
  const schema = getRecordSchemaDefinition(coreBlock);
  if (!schema) {
    return [{
      code: 'unknown_field', coreBlock: String(coreBlock || ''), field: '核心Block', value: coreBlock,
      message: `没有 Record Schema Definition: ${String(coreBlock || '')}`,
    }];
  }

  const issues: RecordSchemaIssue[] = [];
  for (const field of schema.recordFields) {
    if (!field.required) continue;
    const aliases = [field.key, ...(field.aliases || [])];
    const present = aliases.some(alias => {
      const value = fields[alias];
      return value !== undefined && value !== null && String(value).trim() !== '';
    });
    if (!present) issues.push({ code: 'missing_required_field', coreBlock: schema.coreBlock, field: field.key, message: `缺少必填 Record 字段: ${field.key}` });
  }

  for (const [key, value] of Object.entries(fields)) {
    const field = getRecordFieldContract(schema.coreBlock, key);
    if (!field) {
      if (isSafeCustomRecordFieldKey(schema.coreBlock, key)) continue;
      issues.push({ code: 'unknown_field', coreBlock: schema.coreBlock, field: key, value, message: `字段不在 ${schema.coreBlock} 的 Record Schema Definition 中: ${key}` });
      continue;
    }
    if (field.persistence === 'derived') {
      issues.push({ code: 'derived_field_persisted', coreBlock: schema.coreBlock, field: key, value, message: `派生字段不属于最终持久 schema: ${key}` });
    } else if (field.persistence === 'debug') {
      issues.push({ code: 'debug_field_persisted', coreBlock: schema.coreBlock, field: key, value, message: `调试字段不应作为业务字段持久化: ${key}` });
    }
    if (field.allowedValues?.length && value != null && String(value).trim()) {
      const normalized = String(value).trim();
      if (!field.allowedValues.includes(normalized)) {
        issues.push({ code: 'invalid_enum_value', coreBlock: schema.coreBlock, field: key, value, message: `${key}=${normalized} 不在目标枚举中: ${field.allowedValues.join(', ')}` });
      }
    }
  }
  return issues;
}
