// src/core/types/fieldOrigin.ts
/**
 * Field origin metadata.
 *
 * This is intentionally lightweight: it is generated while parsing/scanning and
 * lets UI/debug tooling answer "where did this field value come from?" without
 * guessing from field names.
 */
export type FieldOriginKind =
  | 'markdown_task_kv'
  | 'markdown_block_kv'
  | 'markdown_tag'
  | 'markdown_heading'
  | 'file_path'
  | 'file_stat'
  | 'system_derived'
  | 'cache_restore'
  | 'legacy_fallback';

export type FieldOriginConfidence = 'explicit' | 'derived' | 'legacy';

export interface FieldOrigin {
  /** Canonical field key, e.g. themePath, tags, extra.地点, file.path. */
  field: string;
  /** Parsed value for this origin event. */
  value?: unknown;
  /** Where the value was read or derived from. */
  kind: FieldOriginKind;
  /** Original markdown key, e.g. 主题, 标签, 地点. */
  rawKey?: string;
  /** Source file path when known. */
  sourcePath?: string;
  /** 1-based line number when known. */
  sourceLine?: number;
  /** Parser/helper that produced the value. */
  parser?: string;
  /** Whether this is explicit user data, a derived field, or a legacy fallback. */
  confidence: FieldOriginConfidence;
  /** Optional human-readable note for diagnostics. */
  note?: string;
}

export type FieldOriginMap = Record<string, FieldOrigin[]>;

export interface FieldOriginCarrier {
  fieldOrigins?: FieldOriginMap;
}

export function addFieldOrigin<T extends FieldOriginCarrier>(
  carrier: T,
  field: string,
  origin: Omit<FieldOrigin, 'field'>
): T {
  if (!carrier.fieldOrigins) carrier.fieldOrigins = {};
  const list = carrier.fieldOrigins[field] || [];
  list.push({ field, ...origin });
  carrier.fieldOrigins[field] = list;
  return carrier;
}

export function hasExplicitFieldOrigin(carrier: FieldOriginCarrier | null | undefined, field: string): boolean {
  return !!carrier?.fieldOrigins?.[field]?.some(origin => origin.confidence === 'explicit');
}
