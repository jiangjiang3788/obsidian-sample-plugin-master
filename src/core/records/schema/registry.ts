import { RECORD_SCHEMA_DEFINITIONS } from './definitions';
import type {
  RecordType,
  RecordFieldContract,
  RecordSchemaDefinition,
  RecordSchemaIssue,
} from './types';

function normalizeKey(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase();
}

const BY_RECORD_TYPE = new Map<RecordType, RecordSchemaDefinition>(
  RECORD_SCHEMA_DEFINITIONS.map(schema => [schema.recordType, schema]),
);
const BY_TYPE_ID = new Map<string, RecordSchemaDefinition>(
  RECORD_SCHEMA_DEFINITIONS.map(schema => [schema.id, schema]),
);

const FIELD_INDEX = new Map<RecordType, Map<string, RecordFieldContract>>();
for (const schema of RECORD_SCHEMA_DEFINITIONS) {
  const index = new Map<string, RecordFieldContract>();
  for (const field of schema.recordFields) {
    index.set(normalizeKey(field.key), field);
    for (const alias of field.aliases || []) index.set(normalizeKey(alias), field);
  }
  FIELD_INDEX.set(schema.recordType, index);
}

export function isRecordType(value: unknown): value is RecordType {
  return BY_RECORD_TYPE.has(String(value || '').trim() as RecordType);
}

export function getRecordSchemaDefinition(recordType: unknown): RecordSchemaDefinition | null {
  const key = String(recordType || '').trim() as RecordType;
  return BY_RECORD_TYPE.get(key) || null;
}

export function requireRecordSchemaDefinition(recordType: unknown): RecordSchemaDefinition {
  const schema = getRecordSchemaDefinition(recordType);
  if (!schema) throw new Error(`unknown_record_schema:${String(recordType || '')}`);
  return schema;
}

export function getRecordSchemaDefinitionById(typeId: unknown): RecordSchemaDefinition | null {
  return BY_TYPE_ID.get(String(typeId || '').trim()) || null;
}


export function getRecordFieldContract(recordType: unknown, fieldKey: unknown): RecordFieldContract | null {
  const schema = getRecordSchemaDefinition(recordType);
  if (!schema) return null;
  return FIELD_INDEX.get(schema.recordType)?.get(normalizeKey(fieldKey)) || null;
}

export function canonicalRecordFieldKey(recordType: unknown, fieldKey: unknown): string | null {
  return getRecordFieldContract(recordType, fieldKey)?.key || null;
}

export function getTargetPersistedRecordFields(recordType: unknown): readonly RecordFieldContract[] {
  const schema = getRecordSchemaDefinition(recordType);
  if (!schema) return [];
  return schema.recordFields.filter(field => field.persistence === 'target' || field.persistence === 'omit-default');
}


export function isTargetPersistedRecordField(recordType: unknown, fieldKey: unknown): boolean {
  const field = getRecordFieldContract(recordType, fieldKey);
  return Boolean(field && (field.persistence === 'target' || field.persistence === 'omit-default'));
}

export function isSafeCustomRecordFieldKey(recordType: unknown, fieldKey: unknown): boolean {
  const schema = getRecordSchemaDefinition(recordType);
  if (!schema?.capabilities.customFields) return false;
  const key = String(fieldKey || '').trim();
  if (!key) return false;
  if (getRecordFieldContract(schema.recordType, key)) return false;
  return !['记录ID','recordId','id','记录类型','recordType'].includes(key);
}

export function inspectRecordFieldsAgainstSchema(
  recordType: unknown,
  fields: Record<string, unknown>,
): RecordSchemaIssue[] {
  const schema = getRecordSchemaDefinition(recordType);
  if (!schema) {
    return [{
      code: 'unknown_field', recordType: String(recordType || ''), field: '记录类型', value: recordType,
      message: `没有记录结构定义：${String(recordType || '')}`,
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
    if (!present) issues.push({ code: 'missing_required_field', recordType: schema.recordType, field: field.key, message: `缺少必填记录字段：${field.key}` });
  }

  for (const [key, value] of Object.entries(fields)) {
    const field = getRecordFieldContract(schema.recordType, key);
    if (!field) {
      if (isSafeCustomRecordFieldKey(schema.recordType, key)) continue;
      issues.push({ code: 'unknown_field', recordType: schema.recordType, field: key, value, message: `字段不在 ${schema.recordType} 的记录结构定义中：${key}` });
      continue;
    }
    if (field.persistence === 'derived') {
      issues.push({ code: 'derived_field_persisted', recordType: schema.recordType, field: key, value, message: `派生字段不属于最终持久化结构：${key}` });
    } else if (field.persistence === 'debug') {
      issues.push({ code: 'debug_field_persisted', recordType: schema.recordType, field: key, value, message: `调试字段不应作为业务字段持久化：${key}` });
    }
    if (field.allowedValues?.length && value != null && String(value).trim()) {
      const normalized = String(value).trim();
      if (!field.allowedValues.includes(normalized)) {
        issues.push({ code: 'invalid_enum_value', recordType: schema.recordType, field: key, value, message: `${key}=${normalized} 不在目标枚举中: ${field.allowedValues.join(', ')}` });
      }
    }
  }
  return issues;
}
