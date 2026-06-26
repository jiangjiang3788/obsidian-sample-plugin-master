// src/core/utils/unknownRecord.ts
/**
 * Small boundary helpers for values that come from AI output, Markdown frontmatter,
 * JSON settings, localStorage or old plugin data.  Keep unknown values at the edge
 * and convert them before they enter model/usecase code.
 */
export type UnknownRecord = Record<string, unknown>;

export function isUnknownRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asUnknownRecord(value: unknown): UnknownRecord | undefined {
  return isUnknownRecord(value) ? value : undefined;
}

export function readUnknown(record: UnknownRecord | undefined, key: string): unknown {
  return record?.[key];
}

export function readString(record: UnknownRecord | undefined, key: string): string | undefined {
  const value = readUnknown(record, key);
  return typeof value === 'string' ? value : undefined;
}

export function readTrimmedString(record: UnknownRecord | undefined, key: string): string | undefined {
  const value = readString(record, key)?.trim();
  return value ? value : undefined;
}

export function readNumber(record: UnknownRecord | undefined, key: string): number | undefined {
  const value = readUnknown(record, key);
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function readBoolean(record: UnknownRecord | undefined, key: string): boolean | undefined {
  const value = readUnknown(record, key);
  return typeof value === 'boolean' ? value : undefined;
}

export function readStringArray(record: UnknownRecord | undefined, key: string): string[] {
  const value = readUnknown(record, key);
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function readRecord(record: UnknownRecord | undefined, key: string): UnknownRecord | undefined {
  return asUnknownRecord(readUnknown(record, key));
}

export function readRecordArray(record: UnknownRecord | undefined, key: string): UnknownRecord[] {
  const value = readUnknown(record, key);
  if (!Array.isArray(value)) return [];
  return value.filter(isUnknownRecord);
}

export function readFirstString(record: UnknownRecord | undefined, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = readTrimmedString(record, key);
    if (value) return value;
  }
  return undefined;
}
