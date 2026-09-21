import { RECORD_SCHEMA_DEFINITIONS, type RecordType } from '@/core/records/schema';

/**
 * Canonical human-facing Record type presentation contract.
 *
 * Technical internal records (TaskSeries / TaskSession) remain valid persisted
 * entities, but they never own a separate user-facing identity. Presentation
 * consumers normalize them to Task before ordering, labeling or coloring.
 */
export const RECORD_TYPE_PRESENTATION_ORDER = [
  'task',
  'energy',
  'habit',
  'event',
  'feeling',
  'thought',
  'review',
  'plan',
  'blocker',
  'milestone',
] as const satisfies readonly Exclude<RecordType, 'task-session' | 'task-series'>[];

export type UserVisibleRecordType = (typeof RECORD_TYPE_PRESENTATION_ORDER)[number];
export type CanonicalRecordTypePresentationKey = UserVisibleRecordType;

export interface RecordTypePresentation {
  recordType: UserVisibleRecordType | string;
  label: string;
  order: number;
  /** Small, stable visual glyph for compact action surfaces such as QuickInput. */
  icon: string;
  /** CSS semantic token name. Consumers must not hard-code type colors. */
  colorToken: string;
}

type RecordTypePresentationIdentity = {
  order: number;
  icon: string;
  colorToken: string;
};

const RECORD_TYPE_ICONS: Readonly<Record<UserVisibleRecordType, string>> = Object.freeze({
  task: '✓',
  energy: '⚡',
  habit: '♥',
  event: '◷',
  feeling: '♡',
  thought: '✦',
  review: '≡',
  plan: '◇',
  blocker: '!',
  milestone: '◆',
});

export const RECORD_TYPE_PRESENTATION_REGISTRY = Object.freeze(
  Object.fromEntries(
    RECORD_TYPE_PRESENTATION_ORDER.map((recordType, index) => [
      recordType,
      {
        order: (index + 1) * 10,
        icon: RECORD_TYPE_ICONS[recordType],
        colorToken: `--think-record-type-${recordType}`,
      },
    ]),
  ) as Record<UserVisibleRecordType, RecordTypePresentationIdentity>,
);

const ALIASES = new Map<string, RecordType>();
for (const schema of RECORD_SCHEMA_DEFINITIONS) {
  const candidates = [schema.recordType, schema.id, schema.key, schema.name, schema.displayName];
  for (const candidate of candidates) {
    const key = String(candidate || '').trim().toLocaleLowerCase();
    if (key) ALIASES.set(key, schema.recordType);
  }
}

function toUserVisibleRecordType(recordType: RecordType | string): UserVisibleRecordType | string {
  if (recordType === 'task-session' || recordType === 'task-series') return 'task';
  return recordType;
}

/** Accept canonical keys, core./internal. ids and canonical Chinese type labels. */
export function normalizeRecordTypePresentationKey(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const direct = ALIASES.get(raw.toLocaleLowerCase());
  if (direct) return toUserVisibleRecordType(direct);
  const withoutNamespace = raw.replace(/^(?:core|internal)\./i, '').trim().toLocaleLowerCase();
  const aliased = ALIASES.get(withoutNamespace) || withoutNamespace;
  return toUserVisibleRecordType(aliased);
}

export function getRecordTypePresentationOrder(value: unknown): number {
  const key = normalizeRecordTypePresentationKey(value) as UserVisibleRecordType;
  return RECORD_TYPE_PRESENTATION_REGISTRY[key]?.order ?? Number.MAX_SAFE_INTEGER;
}

export function getRecordTypePresentation(value: unknown): RecordTypePresentation {
  const recordType = normalizeRecordTypePresentationKey(value);
  const schema = RECORD_SCHEMA_DEFINITIONS.find((candidate) => candidate.recordType === recordType);
  const identity = RECORD_TYPE_PRESENTATION_REGISTRY[recordType as UserVisibleRecordType];
  return {
    recordType,
    label: schema?.name || schema?.displayName || recordType || '记录',
    order: identity?.order ?? Number.MAX_SAFE_INTEGER,
    icon: identity?.icon || '•',
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

export function sortRecordTypesByPresentation<T>(items: readonly T[], getKey: (item: T) => unknown): T[] {
  return [...items].sort((left, right) => compareRecordTypeKeys(getKey(left), getKey(right)));
}
