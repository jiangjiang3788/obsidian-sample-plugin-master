import { RECORD_SCHEMA_DEFINITIONS, type RecordCoreBlock } from '@/core/records/schema';

/**
 * Canonical human-facing Record type presentation contract.
 *
 * Schema/catalog order remains a persistence/domain concern. Any UI that needs
 * to enumerate, group or compare Record types must use this contract instead
 * of array position, locale sorting or a view-local list.
 */
export const RECORD_TYPE_PRESENTATION_ORDER = [
  'task',
  'task-session',
  'task-series',
  'energy',
  'habit',
  'evidence',
  'thought',
  'review',
  'plan',
  'blocker',
  'milestone',
] as const satisfies readonly RecordCoreBlock[];

export type CanonicalRecordTypePresentationKey = (typeof RECORD_TYPE_PRESENTATION_ORDER)[number];

export interface RecordTypePresentation {
  coreBlock: RecordCoreBlock | string;
  label: string;
  order: number;
  /** CSS semantic token name. Consumers must not hard-code type colors. */
  colorToken: string;
}

type RecordTypePresentationIdentity = {
  order: number;
  colorToken: string;
};

/**
 * Compile-time exhaustive identity registry for the 11 canonical Record kinds.
 * Human labels continue to come from RecordSchemaDefinition, so labels cannot
 * drift away from the domain schema while order/color remain presentation-owned.
 */
export const RECORD_TYPE_PRESENTATION_REGISTRY = Object.freeze(
  Object.fromEntries(
    RECORD_TYPE_PRESENTATION_ORDER.map((coreBlock, index) => [
      coreBlock,
      { order: (index + 1) * 10, colorToken: `--think-record-type-${coreBlock}` },
    ]),
  ) as Record<RecordCoreBlock, RecordTypePresentationIdentity>,
);

const ALIASES = new Map<string, RecordCoreBlock>();
for (const schema of RECORD_SCHEMA_DEFINITIONS) {
  const candidates = [schema.coreBlock, schema.id, schema.key, schema.name, schema.displayName, schema.categoryKey];
  for (const candidate of candidates) {
    const key = String(candidate || '').trim().toLocaleLowerCase();
    if (key) ALIASES.set(key, schema.coreBlock);
  }
}

/** Accept canonical keys, core./internal. ids and canonical Chinese type labels. */
export function normalizeRecordTypePresentationKey(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const direct = ALIASES.get(raw.toLocaleLowerCase());
  if (direct) return direct;
  const withoutNamespace = raw.replace(/^(?:core|internal)\./i, '').trim().toLocaleLowerCase();
  return ALIASES.get(withoutNamespace) || withoutNamespace;
}

export function getRecordTypePresentationOrder(value: unknown): number {
  const key = normalizeRecordTypePresentationKey(value) as RecordCoreBlock;
  return RECORD_TYPE_PRESENTATION_REGISTRY[key]?.order ?? Number.MAX_SAFE_INTEGER;
}

export function getRecordTypePresentation(value: unknown): RecordTypePresentation {
  const coreBlock = normalizeRecordTypePresentationKey(value);
  const schema = RECORD_SCHEMA_DEFINITIONS.find((candidate) => candidate.coreBlock === coreBlock);
  const identity = RECORD_TYPE_PRESENTATION_REGISTRY[coreBlock as RecordCoreBlock];
  return {
    coreBlock,
    label: schema?.name || schema?.displayName || coreBlock || '记录',
    order: identity?.order ?? Number.MAX_SAFE_INTEGER,
    colorToken: identity?.colorToken || '--think-record-type-neutral',
  };
}

export function compareRecordTypeKeys(left: unknown, right: unknown): number {
  const leftKey = normalizeRecordTypePresentationKey(left);
  const rightKey = normalizeRecordTypePresentationKey(right);
  const leftOrder = getRecordTypePresentationOrder(leftKey);
  const rightOrder = getRecordTypePresentationOrder(rightKey);
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return leftKey.localeCompare(rightKey, 'zh-CN');
}

export function sortRecordTypesByPresentation<T>(
  items: readonly T[],
  getKey: (item: T) => unknown,
): T[] {
  return [...items].sort((left, right) => compareRecordTypeKeys(getKey(left), getKey(right)));
}
