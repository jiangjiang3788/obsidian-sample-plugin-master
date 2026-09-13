// Goal-only AI batch confirmation model.
import type { RecordCaptureTemplate, InputSettings, NaturalRecordCommand } from '@core/types/public';
import type { GoalDefinition, GoalSettings, GoalTemplate } from '@core/goal/public';
import type { RecordSubmitResult, SubmitCreateRecordParams } from '@core/recordInput/public';
import { getEffectiveTemplate } from '@core/utils/public';
import { buildBatchCreateRecordSubmitResult, buildRecordDraftContext, normalizeRecordInputFormDataForTemplate } from '@core/recordInput/public';
import { findGoalTemplate, normalizeGoalPath, splitGoalPath } from '@core/goal/public';

export interface AiBatchConfirmRecordItem {
  id: string;
  cmd: NaturalRecordCommand;
  recordTypeId: string;
  goalLabel: string;
  presetLabel: string;
  formData: Record<string, unknown>;
  /** Immutable context seed for QuickInputEditor. Never replace this during draft edits. */
  editorContext: Record<string, unknown>;
  saved: boolean;
  skipped: boolean;
}

export interface BuildAiBatchConfirmRecordItemsInput {
  items: NaturalRecordCommand[];
  recordTypes: RecordCaptureTemplate[];
  goalSettings?: GoalSettings;
  inputSettings: InputSettings;
}

export interface AiBatchConfirmRecordSummary {
  savedCount: number;
  skippedCount: number;
  pendingCount: number;
}

export interface AiBatchConfirmEditorDraftState {
  recordTypeId: string;
  formData: Record<string, unknown>;
  goalPath?: string | null;
  goalTitle?: string | null;
  templateSourceType?: 'record-type' | 'goal-template' | null;
}

export function resolveGoalForAiTarget(
  goalSettings: GoalSettings | undefined,
  target: NaturalRecordCommand['target'],
): GoalDefinition | null {
  const targetPath = normalizeGoalPath(String(target.goalPath || ''));
  if (!targetPath) return null;
  return (goalSettings?.goals || []).find(
    (goal) => normalizeGoalPath(goal.path) === targetPath,
  ) || null;
}

export function resolvePresetForAiTarget(
  goalSettings: GoalSettings | undefined,
  goal: GoalDefinition | null,
  recordTypeId: string,
  target: NaturalRecordCommand['target'],
): GoalTemplate | null {
  if (!goal || !recordTypeId) return null;
  const resolved = findGoalTemplate(goalSettings, goal, recordTypeId);
  if (!resolved || resolved.enabled === false) return null;
  const explicitId = String(target.goalTemplateId || '').trim();
  if (explicitId && resolved.id !== explicitId) return null;
  return resolved;
}

export function shortDisplay(value: unknown, fallback = '—', max = 32): string {
  const text = String(value ?? '').trim();
  if (!text) return fallback;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function presetDisplayName(preset: GoalTemplate | null): string {
  return preset ? '已配置' : '记录类型默认';
}

export function goalDisplayName(goal: GoalDefinition | null, goalPath?: string): string {
  const path = normalizeGoalPath(goal?.path || goalPath || '');
  return splitGoalPath(path).leafGoal || path || '未匹配目标';
}

export function buildAiBatchConfirmRecordItems({
  items,
  recordTypes,
  goalSettings,
  inputSettings,
}: BuildAiBatchConfirmRecordItemsInput): AiBatchConfirmRecordItem[] {
  return items.map((cmd, index) => {
    const recordType = cmd.target.recordTypeId ? recordTypes.find((entry) => entry.id === cmd.target.recordTypeId) : undefined;

    const goal = resolveGoalForAiTarget(goalSettings, cmd.target);
    const goalPath = normalizeGoalPath(goal?.path || cmd.target.goalPath || '');
    const preset = recordType ? resolvePresetForAiTarget(goalSettings, goal, recordType.id, cmd.target) : null;
    const initialTemplate = preset || (recordType ? getEffectiveTemplate(inputSettings, recordType.id).template : undefined);
    const initialFormData = {
      ...(cmd.fieldValues || {}),
      ...(goalPath ? { goalPath, '目标': goalPath } : {}),
    };
    const editorContext = buildRecordDraftContext(
      cmd.fieldValues,
      goalPath ? { goalPath, '目标': goalPath } : undefined,
    );

    return {
      id: `record-${index}`,
      cmd,
      recordTypeId: recordType?.id || '',
      goalLabel: goalDisplayName(goal, goalPath || undefined),
      presetLabel: presetDisplayName(preset),
      formData: normalizeRecordInputFormDataForTemplate(initialTemplate ?? undefined, initialFormData),
      editorContext,
      saved: false,
      skipped: false,
    };
  });
}

export function materializeAiBatchConfirmRecordDraft(
  record: AiBatchConfirmRecordItem,
  state: AiBatchConfirmEditorDraftState | null | undefined,
): AiBatchConfirmRecordItem {
  if (!state) return record;

  const nextGoalLabel = state.goalTitle
    || goalDisplayName(null, state.goalPath || String(state.formData.goalPath || state.formData['目标'] || ''));
  const nextPresetLabel = state.templateSourceType === 'goal-template'
    ? '已配置'
    : state.templateSourceType === 'record-type'
      ? '记录类型默认'
      : record.presetLabel;

  return {
    ...record,
    recordTypeId: state.recordTypeId || record.recordTypeId,
    goalLabel: nextGoalLabel,
    presetLabel: nextPresetLabel,
    formData: { ...state.formData },
  };
}

export function patchAiBatchConfirmRecordAtIndex(
  records: AiBatchConfirmRecordItem[],
  index: number,
  updates: Partial<AiBatchConfirmRecordItem>,
): AiBatchConfirmRecordItem[] {
  return records.map((record, currentIndex) => currentIndex === index ? { ...record, ...updates } : record);
}

export function findNextPendingAiBatchConfirmIndex(records: AiBatchConfirmRecordItem[], currentIndex: number): number {
  const isPending = (record: AiBatchConfirmRecordItem) => !record.saved && !record.skipped;
  for (let index = currentIndex + 1; index < records.length; index += 1) {
    if (isPending(records[index])) return index;
  }
  for (let index = 0; index < Math.min(currentIndex, records.length); index += 1) {
    if (isPending(records[index])) return index;
  }
  return -1;
}

export function summarizeAiBatchConfirmRecords(records: AiBatchConfirmRecordItem[]): AiBatchConfirmRecordSummary {
  const savedCount = records.filter((record) => record.saved).length;
  const skippedCount = records.filter((record) => record.skipped).length;
  return { savedCount, skippedCount, pendingCount: records.length - savedCount - skippedCount };
}

export function buildAiBatchConfirmRecordContext(record: AiBatchConfirmRecordItem): Record<string, unknown> {
  return buildRecordDraftContext(record.editorContext, record.formData);
}

export function buildAiBatchConfirmCreateSubmitParams(
  record: AiBatchConfirmRecordItem,
  signal?: AbortSignal,
): SubmitCreateRecordParams {
  return {
    recordTypeId: record.recordTypeId,
    formData: record.formData,
    context: buildAiBatchConfirmRecordContext(record),
    signal,
    source: 'ai_batch',
  };
}

export function buildAiBatchConfirmBatchSummary(results: RecordSubmitResult[]): RecordSubmitResult {
  return buildBatchCreateRecordSubmitResult(results);
}
