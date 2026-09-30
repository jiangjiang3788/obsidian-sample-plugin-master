import type { NaturalRecordBatch, NaturalRecordCommand } from '@/core/types/ai-schema';
import { isSystemRecordContextField } from '../goal/contextFields';
import { normalizeAiTaskCaptureFields } from './AiTaskCapture';
import { asUnknownRecord, isUnknownRecord, readTrimmedString } from '../utils/unknownRecord';
import type { UnknownRecord } from '../utils/unknownRecord';
import type { AiParserSnapshot, AiSnapshotRecordType, AiSnapshotGoal, AiSnapshotPreset } from './AiParserSnapshot';

type AiCommandTarget = NaturalRecordCommand['target'] & UnknownRecord;
type AiParsedCommand = NaturalRecordCommand & { target: AiCommandTarget; fieldValues: Record<string, unknown> };

function ensureCommandTarget(item: Partial<NaturalRecordCommand> & { target?: unknown }): AiCommandTarget {
  if (!isUnknownRecord(item.target)) item.target = { recordTypeId: '' };
  const target = item.target as AiCommandTarget;
  if (typeof target.recordTypeId !== 'string') target.recordTypeId = '';
  return target;
}

export function cleanAiFieldValues(values: unknown): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const record = asUnknownRecord(values);
  if (!record) return result;
  for (const [key, value] of Object.entries(record)) {
    if (isSystemRecordContextField(key)) continue;
    result[key] = value;
  }
  return result;
}

function targetString(target: UnknownRecord, key: string): string {
  return readTrimmedString(target, key) ?? '';
}

function findRecordTypeByTarget(snapshot: AiParserSnapshot, target: UnknownRecord): AiSnapshotRecordType | null {
  const recordTypes = snapshot.recordTypes ?? [];
  const recordTypeId = targetString(target, 'recordTypeId');
  return recordTypes.find((recordType) => recordType.id === recordTypeId || recordType.name === recordTypeId) || null;
}

function findGoalByTarget(snapshot: AiParserSnapshot, target: UnknownRecord): AiSnapshotGoal | null {
  const path = targetString(target, 'goalPath');
  return (snapshot.goals ?? []).find((goal) => goal.path === path) || null;
}

function findPresetByTarget(snapshot: AiParserSnapshot, target: UnknownRecord): AiSnapshotPreset | null {
  const presets = snapshot.goalPresets ?? [];
  const goalPath = targetString(target, 'goalPath');
  const rawTypeId = targetString(target, 'recordTypeId');
  const recordTypeId = findRecordTypeByTarget(snapshot, target)?.id || rawTypeId;
  const explicitId = targetString(target, 'goalTemplateId') || targetString(target, 'templateId');
  const matchesContext = (preset: AiSnapshotPreset) =>
    (!goalPath || preset.goalPath === goalPath)
    && (!recordTypeId || preset.recordTypeId === recordTypeId);
  if (explicitId) {
    const exact = presets.filter((preset) => preset.id === explicitId || preset.goalTemplateId === explicitId);
    return exact.length === 1 && matchesContext(exact[0]) ? exact[0] : null;
  }
  // Missing or ambiguous context must remain unresolved for user confirmation.
  // Array order is not evidence of which Goal the user intended.
  if (!goalPath && !recordTypeId) return null;
  const candidates = presets.filter(matchesContext);
  return candidates.length === 1 ? candidates[0] : null;
}

export function normalizeParsedBatch(
  batch: NaturalRecordBatch,
  snapshot: AiParserSnapshot,
  rawText: string,
): NaturalRecordBatch {
  if (!batch.items) batch.items = [];
  batch.items.forEach((item) => {
    const parsedItem = item as AiParsedCommand;
    if (!parsedItem.rawText) parsedItem.rawText = rawText;
    const target = ensureCommandTarget(parsedItem);
    parsedItem.fieldValues = cleanAiFieldValues(parsedItem.fieldValues);

    const preset = findPresetByTarget(snapshot, target);
    if (preset) {
      target.goalTemplateId = preset.goalTemplateId || preset.id;
      target.goalPath = preset.goalPath || target.goalPath;
      target.recordTypeId = preset.recordTypeId || target.recordTypeId;
    }

    const recordType = findRecordTypeByTarget(snapshot, target);
    if (recordType) {
      target.recordTypeId = recordType.id || target.recordTypeId || '';
    }

    const goal = findGoalByTarget(snapshot, target);
    if (goal) target.goalPath = target.goalPath || goal.path;

    if (target.recordTypeId === 'core.task') {
      parsedItem.fieldValues = normalizeAiTaskCaptureFields(parsedItem.fieldValues);
    }

  });
  return batch;
}
