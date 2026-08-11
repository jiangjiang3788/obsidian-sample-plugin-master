import type { Item } from '@/core/types/schema';
import { parseRecurrence, type RecurrenceInfo } from './mark';

const NON_RECURRING_MARKERS = new Set([
  '',
  'none',
  'no',
  'false',
  '0',
  'off',
  '\u4e0d\u91cd\u590d',
  '\u65e0',
]);

export function normalizeTaskRecurrenceValue(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (NON_RECURRING_MARKERS.has(raw.toLowerCase())) return null;
  return raw;
}

/**
 * Returns the canonical parsed recurrence for a normalized Task Item.
 * Accepts recurrenceInfo, normalized pure recurrence text, or the raw source line.
 */
export function getTaskRecurrenceInfo(item: Pick<Item, 'recurrence' | 'recurrenceInfo' | 'rawSource' | 'fullData'>): RecurrenceInfo | null {
  if (item.recurrenceInfo) return item.recurrenceInfo;
  const normalized = normalizeTaskRecurrenceValue(item.recurrence);
  if (normalized) {
    const parsedNormalized = parseRecurrence(normalized);
    if (parsedNormalized) return parsedNormalized;
  }
  const raw = String(item.rawSource || item.fullData || '');
  return raw ? parseRecurrence(raw) : null;
}

/**
 * Canonical recurrence predicate for normalized Task Items.
 *
 * RecordNormalizer intentionally stores non-recurring tasks as recurrence="none".
 * Therefore callers must never use Boolean(item.recurrence) as a recurrence test.
 */
export function isTaskRecurring(item: Pick<Item, 'recurrence' | 'recurrenceInfo' | 'rawSource' | 'fullData'>): boolean {
  return getTaskRecurrenceInfo(item) != null;
}
