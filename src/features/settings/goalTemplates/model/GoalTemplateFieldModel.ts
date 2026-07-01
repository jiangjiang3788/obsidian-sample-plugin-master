import type { TemplateField } from '@core/types/public';
import type { UnknownRecord } from '@core/utils/public';
import { isUnknownRecord } from '@core/utils/public';
import { compactText } from './GoalTemplateThemeModel';

export function deriveRequiredFields(fields: TemplateField[]): string[] {
  return (fields || [])
    .filter((field) => field.required === true)
    .map((field) => compactText(field.key || field.label))
    .filter(Boolean);
}

type StableJsonValue = string | number | boolean | null | StableJsonValue[] | { [key: string]: StableJsonValue };

function stableJson(value: unknown): string {
  const seen = new WeakSet<object>();
  const normalize = (input: unknown): StableJsonValue | undefined => {
    if (input === undefined) return undefined;
    if (input === null) return null;
    if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') return input;
    if (typeof input !== 'object') return compactText(input);
    if (seen.has(input)) return '[Circular]';
    seen.add(input);
    if (Array.isArray(input)) return input.map(normalize).filter((item): item is StableJsonValue => item !== undefined);
    if (!isUnknownRecord(input)) return compactText(input);
    const out: Record<string, StableJsonValue> = {};
    Object.keys(input).sort().forEach((key) => {
      const value = normalize(input[key]);
      if (value !== undefined) out[key] = value;
    });
    return out;
  };
  return JSON.stringify(normalize(value));
}

function compactFieldForStructureCompare(field: TemplateField): Record<string, unknown> {
  const source = field as unknown as UnknownRecord;
  const out: Record<string, unknown> = {};
  Object.keys(source).sort().forEach((key) => {
    if (key === 'id' || key === 'defaultValue' || key === 'required') return;
    const value = source[key];
    if (value === undefined || value === null || value === '') return;
    out[key] = value;
  });
  return out;
}

export function fieldsHaveSameStructure(left: TemplateField[] | undefined, right: TemplateField[] | undefined): boolean {
  const normalize = (fields: TemplateField[] | undefined) => (fields || []).map(compactFieldForStructureCompare);
  return stableJson(normalize(left)) === stableJson(normalize(right));
}

export function equalStringSet(left: string[], right: string[]): boolean {
  const a = new Set(left.map(compactText).filter(Boolean));
  const b = new Set(right.map(compactText).filter(Boolean));
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}

export function getFieldDefaultMap(fields: TemplateField[] | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const field of fields || []) {
    const key = compactText(field.key || field.label);
    if (!key) continue;
    const value = field.defaultValue;
    if (value !== undefined && value !== null && compactText(value) !== '') result[key] = compactText(value);
  }
  return result;
}
