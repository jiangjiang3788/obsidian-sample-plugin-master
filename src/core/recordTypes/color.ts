import { RECORD_TYPE_PRESENTATION_ORDER, type UserVisibleRecordType } from './presentation';

export type RecordTypeColorOverrides = Partial<Record<UserVisibleRecordType, string>>;

/** Picker fallback only. Product defaults remain CSS tokens so light/dark themes stay theme-owned. */
export const DEFAULT_RECORD_TYPE_COLOR_HEX: Readonly<Record<UserVisibleRecordType, string>> = Object.freeze({
  task: '#4f7cff',
  energy: '#d98b22',
  habit: '#20a675',
  event: '#e8783d',
  feeling: '#c85f9e',
  thought: '#8b68d8',
  review: '#d65b74',
  plan: '#547aa5',
  blocker: '#c94f4f',
  milestone: '#a98213',
});

export function normalizeRecordTypeColorHex(value: unknown): string | null {
  const raw = String(value ?? '').trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-f]{3}$/.test(raw)) {
    return `#${raw.slice(1).split('').map((part) => part + part).join('')}`;
  }
  return null;
}

export function normalizeRecordTypeColorOverrides(value: unknown): RecordTypeColorOverrides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const out: RecordTypeColorOverrides = {};
  for (const recordType of RECORD_TYPE_PRESENTATION_ORDER) {
    const color = normalizeRecordTypeColorHex(source[recordType]);
    if (color) out[recordType] = color;
  }
  return out;
}

export function buildRecordTypeColorCssVariables(overrides: RecordTypeColorOverrides | undefined): Record<string, string> {
  const normalized = normalizeRecordTypeColorOverrides(overrides);
  return Object.fromEntries(
    RECORD_TYPE_PRESENTATION_ORDER
      .filter((recordType) => !!normalized[recordType])
      .map((recordType) => [`--think-record-type-${recordType}`, normalized[recordType]!]),
  );
}
