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
  blockId: string;
  goalLabel: string;
  presetLabel: string;
  formData: Record<string, unknown>;
  saved: boolean;
  skipped: boolean;
}

export interface BuildAiBatchConfirmRecordItemsInput {
  items: NaturalRecordCommand[];
  blocks: RecordCaptureTemplate[];
  goalSettings?: GoalSettings;
  inputSettings: InputSettings;
}

export interface AiBatchConfirmRecordSummary {
  savedCount: number;
  skippedCount: number;
  pendingCount: number;
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
  blockId: string,
  target: NaturalRecordCommand['target'],
): GoalTemplate | null {
  if (!goal || !blockId) return null;
  const resolved = findGoalTemplate(goalSettings, goal, blockId);
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
  blocks,
  goalSettings,
  inputSettings,
}: BuildAiBatchConfirmRecordItemsInput): AiBatchConfirmRecordItem[] {
  return items.map((cmd, index) => {
    let block = cmd.target.blockId ? blocks.find((entry) => entry.id === cmd.target.blockId) : undefined;
    if (!block && cmd.target.categoryKey) block = blocks.find((entry) => entry.categoryKey === cmd.target.categoryKey);
    if (!block && blocks.length > 0) block = blocks[0];

    const goal = resolveGoalForAiTarget(goalSettings, cmd.target);
    const goalPath = normalizeGoalPath(goal?.path || cmd.target.goalPath || '');
    const preset = block ? resolvePresetForAiTarget(goalSettings, goal, block.id, cmd.target) : null;
    const initialTemplate = preset || (block ? getEffectiveTemplate(inputSettings, block.id, undefined).template : undefined);
    const initialFormData = {
      ...(cmd.fieldValues || {}),
      ...(goalPath ? { goalPath, '目标': goalPath } : {}),
    };

    return {
      id: `record-${index}`,
      cmd,
      blockId: block?.id || '',
      goalLabel: goalDisplayName(goal, goalPath || undefined),
      presetLabel: presetDisplayName(preset),
      formData: normalizeRecordInputFormDataForTemplate(initialTemplate ?? undefined, initialFormData),
      saved: false,
      skipped: false,
    };
  });
}

export function patchAiBatchConfirmRecordAtIndex(
  records: AiBatchConfirmRecordItem[],
  index: number,
  updates: Partial<AiBatchConfirmRecordItem>,
): AiBatchConfirmRecordItem[] {
  return records.map((record, currentIndex) => currentIndex === index ? { ...record, ...updates } : record);
}

export function findNextPendingAiBatchConfirmIndex(records: AiBatchConfirmRecordItem[], currentIndex: number): number {
  return records.findIndex((record, index) => index > currentIndex && !record.saved && !record.skipped);
}

export function summarizeAiBatchConfirmRecords(records: AiBatchConfirmRecordItem[]): AiBatchConfirmRecordSummary {
  const savedCount = records.filter((record) => record.saved).length;
  const skippedCount = records.filter((record) => record.skipped).length;
  return { savedCount, skippedCount, pendingCount: records.length - savedCount - skippedCount };
}

export function buildAiBatchConfirmRecordContext(record: AiBatchConfirmRecordItem): Record<string, unknown> {
  return buildRecordDraftContext(record.cmd.fieldValues, record.formData);
}

export function buildAiBatchConfirmCreateSubmitParams(record: AiBatchConfirmRecordItem): SubmitCreateRecordParams {
  return {
    blockId: record.blockId,
    formData: record.formData,
    context: buildAiBatchConfirmRecordContext(record),
    source: 'ai_batch',
  };
}

export function buildAiBatchConfirmBatchSummary(results: RecordSubmitResult[]): RecordSubmitResult {
  return buildBatchCreateRecordSubmitResult(results);
}
