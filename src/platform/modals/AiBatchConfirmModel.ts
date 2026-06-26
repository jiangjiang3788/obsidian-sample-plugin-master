// src/platform/modals/AiBatchConfirmModel.ts
import type { NaturalRecordCommand, RecordSubmitResult, SubmitCreateRecordParams } from '@core/public';
import {
  buildBatchCreateRecordSubmitResult,
  buildRecordDraftContext,
  getEffectiveTemplate,
  getGoalTemplateVariants,
  normalizeRecordInputFormDataForTemplate,
  splitGoalPath,
} from '@core/public';

export interface AiBatchConfirmRecordItem {
  id: string;
  cmd: NaturalRecordCommand;
  blockId: string;
  themeId?: string;
  goalLabel: string;
  presetLabel: string;
  themePath?: string;
  formData: Record<string, any>;
  saved: boolean;
  skipped: boolean;
}

export interface BuildAiBatchConfirmRecordItemsInput {
  items: NaturalRecordCommand[];
  blocks: any[];
  themes: any[];
  goalSettings: any;
  inputSettings: any;
}

export interface AiBatchConfirmRecordSummary {
  savedCount: number;
  skippedCount: number;
  pendingCount: number;
}

export function resolveGoalForAiTarget(goalSettings: any, target: NaturalRecordCommand['target']): any | null {
  const goals = goalSettings?.goals || [];
  if (!goals.length) return null;

  const targetGoalId = String(target.goalId || '').trim();
  if (targetGoalId) {
    const byId = goals.find((goal: any) => goal.id === targetGoalId);
    if (byId) return byId;
  }

  const targetGoalPath = splitGoalPath(String(target.goalPath || '')).goalPath;
  if (targetGoalPath) {
    const byPath = goals.find((goal: any) => splitGoalPath(String(goal.goalPath || goal.title || '')).goalPath === targetGoalPath);
    if (byPath) return byPath;
  }

  return null;
}

export function resolvePresetForAiTarget(goalSettings: any, goal: any | null, blockId: string, target: NaturalRecordCommand['target']): any | null {
  if (!goal || !blockId) return null;
  const variants = getGoalTemplateVariants(goalSettings, goal, blockId) || [];
  if (!variants.length) return null;

  const exact = String(target.goalTemplateId || '').trim();
  if (exact) {
    const matched = variants.find((preset: any) => preset.id === exact);
    if (matched) return matched;
  }

  const variantId = String(target.templateVariantId || '').trim();
  if (variantId) {
    const matched = variants.find((preset: any) => preset.variantId === variantId || preset.id === variantId || preset.name === variantId);
    if (matched) return matched;
  }

  return variants.find((preset: any) => preset.isDefault) || variants[0] || null;
}

export function readPresetThemePath(preset: any | null): string | undefined {
  const raw = preset?.defaultValues?.themePath ?? preset?.defaultValues?.['主题'];
  if (!raw) return undefined;
  if (typeof raw === 'string') return raw.trim() || undefined;
  if (typeof raw === 'object' && raw && 'value' in raw) return String(raw.value || '').trim() || undefined;
  return undefined;
}

export function shortDisplay(value: unknown, fallback = '—', max = 32): string {
  const text = String(value ?? '').trim();
  if (!text) return fallback;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function presetDisplayName(preset: any | null): string {
  if (!preset) return 'CoreBlock 默认';
  return String(preset.name || preset.variantId || '默认预设').trim() || '默认预设';
}

export function goalDisplayName(goal: any | null, goalPath?: string): string {
  if (goal?.title) return String(goal.title);
  const normalized = splitGoalPath(String(goal?.goalPath || goalPath || '')).leafGoal;
  return normalized || String(goalPath || '未匹配目标');
}

export function buildAiBatchConfirmRecordItems({
  items,
  blocks,
  themes,
  goalSettings,
  inputSettings,
}: BuildAiBatchConfirmRecordItemsInput): AiBatchConfirmRecordItem[] {
  return items.map((cmd, index) => {
    let block = cmd.target.blockId ? blocks.find((entry) => entry.id === cmd.target.blockId) : undefined;
    if (!block && cmd.target.categoryKey) {
      block = blocks.find((entry) => entry.categoryKey === cmd.target.categoryKey);
    }
    if (!block && blocks.length > 0) block = blocks[0];

    const goal = resolveGoalForAiTarget(goalSettings, cmd.target);
    const goalPath = goal ? splitGoalPath(String(goal.goalPath || goal.title || '')).goalPath : splitGoalPath(String(cmd.target.goalPath || '')).goalPath;
    const goalId = goal?.id || String(cmd.target.goalId || '').trim() || undefined;
    const preset = block ? resolvePresetForAiTarget(goalSettings, goal, block.id, cmd.target) : null;
    const presetThemePath = readPresetThemePath(preset);

    let themeId: string | undefined;
    const preferredTheme = presetThemePath || cmd.target.themeId;
    if (preferredTheme) {
      const theme = themes.find((entry) => entry.id === preferredTheme || entry.path === preferredTheme);
      if (theme) themeId = theme.id;
    }
    if (!themeId && themes.length > 0) themeId = themes[0].id;

    const selectedTheme = themeId ? themes.find((entry) => entry.id === themeId) : undefined;
    const aiThemePath = cmd.target.themeId ? themes.find((entry) => entry.id === cmd.target.themeId || entry.path === cmd.target.themeId)?.path : undefined;
    const themePath = presetThemePath || selectedTheme?.path || aiThemePath || undefined;
    const initialTemplate = preset || (block ? getEffectiveTemplate(inputSettings, block.id, themeId).template : undefined);
    const initialFormData = {
      ...(cmd.fieldValues || {}),
      ...(goalId ? { goalId, '目标ID': goalId } : {}),
      ...(goalPath ? { goalPath, '目标': goalPath } : {}),
      ...(preset ? { templateVariantId: preset.variantId || 'default', goalTemplateVariantId: preset.variantId || 'default' } : {}),
      ...(themePath ? { themePath, '主题': themePath } : {}),
    };

    return {
      id: `record-${index}`,
      cmd,
      blockId: block?.id || '',
      themeId,
      goalLabel: goalDisplayName(goal, goalPath),
      presetLabel: presetDisplayName(preset),
      themePath,
      formData: normalizeRecordInputFormDataForTemplate(initialTemplate ?? undefined, initialFormData),
      saved: false,
      skipped: false,
    };
  });
}

export function patchAiBatchConfirmRecordAtIndex(
  records: AiBatchConfirmRecordItem[],
  index: number,
  updates: Partial<AiBatchConfirmRecordItem>
): AiBatchConfirmRecordItem[] {
  return records.map((record, currentIndex) => (currentIndex === index ? { ...record, ...updates } : record));
}

export function findNextPendingAiBatchConfirmIndex(records: AiBatchConfirmRecordItem[], currentIndex: number): number {
  return records.findIndex((record, index) => index > currentIndex && !record.saved && !record.skipped);
}

export function summarizeAiBatchConfirmRecords(records: AiBatchConfirmRecordItem[]): AiBatchConfirmRecordSummary {
  const savedCount = records.filter((record) => record.saved).length;
  const skippedCount = records.filter((record) => record.skipped).length;
  return {
    savedCount,
    skippedCount,
    pendingCount: records.length - savedCount - skippedCount,
  };
}

export function buildAiBatchConfirmRecordContext(record: AiBatchConfirmRecordItem): Record<string, any> {
  return buildRecordDraftContext(record.cmd.fieldValues, record.formData);
}

export function buildAiBatchConfirmCreateSubmitParams(record: AiBatchConfirmRecordItem): SubmitCreateRecordParams {
  return {
    blockId: record.blockId,
    themeId: record.themeId ?? null,
    formData: record.formData,
    context: buildAiBatchConfirmRecordContext(record),
    source: 'ai_batch',
  };
}

export function buildAiBatchConfirmBatchSummary(results: RecordSubmitResult[]): RecordSubmitResult {
  return buildBatchCreateRecordSubmitResult(results);
}
