import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { normalizeGoalPath } from '@/core/goal';
import { getCreateAvailableRecordTypes } from '@/core/services/GoalTemplateResolver';
import { getEffectiveRecordTypes, normalizeRecordTypePresentationKey } from '@/core/recordTypes/public';
import type { RecordContinuationContext, RecordContinuationFollowUp } from '@/core/types/recordInput';

function localDateKey(value: string | number | Date | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const raw = typeof value === 'string' ? value.trim() : '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return match?.[1] || null;
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveCompletionDate(record: RecordViewItem, now: Date): string {
  return localDateKey(record.completedAt)
    || localDateKey(record.doneDate)
    || localDateKey(record.date)
    || localDateKey(now)
    || '';
}

function resolveRecordTypeId(recordType: unknown): string | null {
  const presentationKey = normalizeRecordTypePresentationKey(recordType);
  if (!presentationKey) return null;
  return getEffectiveRecordTypes().find((candidate) => (
    normalizeRecordTypePresentationKey(candidate.id) === presentationKey
  ))?.id || null;
}

function normalizeCompletedRecordTypeIds(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const validIds = new Set(getEffectiveRecordTypes().map((recordType) => recordType.id));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const id = String(value || '').trim();
    if (!id || !validIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

function readContinuationContext(context?: Record<string, unknown> | null): RecordContinuationContext | null {
  const raw = context?.__recordContinuation;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const candidate = raw as Record<string, unknown>;
  const sourceRecordId = String(candidate.sourceRecordId || '').trim();
  const expectedGoalPath = normalizeGoalPath(candidate.expectedGoalPath) || '';
  if (!sourceRecordId || !expectedGoalPath || candidate.reason !== 'task_completion') return null;
  return {
    sourceRecordId,
    reason: 'task_completion',
    expectedGoalPath,
    completedRecordTypeIds: normalizeCompletedRecordTypeIds(candidate.completedRecordTypeIds),
  };
}

function buildContinuation(input: {
  settings: ThinkSettings;
  sourceRecordId: string;
  goalPath: string;
  date?: string | null;
  completedRecordTypeIds: string[];
}): RecordContinuationFollowUp | null {
  const completed = new Set(normalizeCompletedRecordTypeIds(input.completedRecordTypeIds));
  const availableRecordTypes = getCreateAvailableRecordTypes(input.settings, input.goalPath)
    .filter((recordType) => !completed.has(recordType.id));
  if (!availableRecordTypes.length) return null;

  const continuationContext: RecordContinuationContext = {
    sourceRecordId: input.sourceRecordId,
    reason: 'task_completion',
    expectedGoalPath: input.goalPath,
    completedRecordTypeIds: [...completed],
  };

  return {
    kind: 'record_continuation',
    reason: 'task_completion',
    sourceRecordId: input.sourceRecordId,
    goalPath: input.goalPath,
    dismissOnOutsideClick: true,
    options: availableRecordTypes.map((recordType) => ({
      kind: 'create_record' as const,
      label: recordType.name || recordType.id,
      recordTypeId: recordType.id,
      context: {
        goalPath: input.goalPath,
        ...(input.date ? { date: input.date } : {}),
        __recordContinuation: continuationContext,
      },
      allowRecordTypeSwitch: false as const,
    })),
  };
}

/**
 * Completed-Task continuation policy.
 *
 * The completed Task itself is already done, so Task is immediately excluded
 * from the panel. Remaining choices come from the same availability resolver
 * and the same canonical presentation order as normal QuickInput.
 */
export function resolveTaskCompletionContinuation(input: {
  record: RecordViewItem | null | undefined;
  settings: ThinkSettings;
  now?: Date;
}): RecordContinuationFollowUp | null {
  const record = input.record;
  if (!record || record.recordType !== 'task' || record.status !== 'done') return null;

  const goalPath = normalizeGoalPath(record.goalPath) || '';
  if (!goalPath) return null;

  const completedRecordTypeId = resolveRecordTypeId(record.recordType);
  if (!completedRecordTypeId) return null;

  return buildContinuation({
    settings: input.settings,
    sourceRecordId: record.id,
    goalPath,
    date: resolveCompletionDate(record, input.now ?? new Date()),
    completedRecordTypeIds: [completedRecordTypeId],
  });
}

/**
 * Continue an existing low-friction capture chain after the chosen next Record
 * has actually been persisted. Previously completed types are hidden, so the
 * panel only shows actions that are still unused in the current chain.
 */
export function resolveContinuationAfterCreate(input: {
  record: RecordViewItem | null | undefined;
  settings: ThinkSettings;
  context?: Record<string, unknown> | null;
  now?: Date;
}): RecordContinuationFollowUp | null {
  const previous = readContinuationContext(input.context);
  const record = input.record;
  if (!previous || !record) return null;

  const goalPath = normalizeGoalPath(record.goalPath) || '';
  if (!goalPath || goalPath !== previous.expectedGoalPath) return null;

  const completedRecordTypeId = resolveRecordTypeId(record.recordType);
  if (!completedRecordTypeId) return null;

  const completedRecordTypeIds = [
    ...previous.completedRecordTypeIds,
    completedRecordTypeId,
  ];
  const date = localDateKey(input.context?.date)
    || localDateKey(record.date)
    || localDateKey(input.now ?? new Date());

  return buildContinuation({
    settings: input.settings,
    sourceRecordId: previous.sourceRecordId,
    goalPath,
    date,
    completedRecordTypeIds,
  });
}
