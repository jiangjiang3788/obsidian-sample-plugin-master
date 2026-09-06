import type { GoalDefinition, GoalSettings, GoalTemplateStorageRow } from './types';
import { normalizeGoalPath } from './path';

const GOAL_CONTEXT_KEYS = new Set(['goalPath', '目标', '目标路径']);
const GOAL_TEMPLATE_ICON_KEYS = new Set(['icon', '图标']);

function hasHash(value: unknown): boolean {
  const text = String(value ?? '');
  return text.includes('#') || text.includes('＃');
}

function assertGoal(goal: GoalDefinition): void {
  const raw = String(goal.path || '').trim();
  if (hasHash(raw)) throw new Error(`Invalid Goal path ${raw}: Goal must not contain #.`);
  const normalized = normalizeGoalPath(raw);
  if (!normalized) throw new Error('Invalid Goal: canonical slash path is required.');
  if (goal.path !== normalized) throw new Error(`Invalid Goal path: expected ${normalized}.`);
  if (goal.timePresetPercent !== undefined) {
    const percent = Number(goal.timePresetPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      throw new Error(`Invalid Goal timePresetPercent for ${normalized}: expected 0..100.`);
    }
  }
  if (goal.weeklyTargetMinutes !== undefined) {
    const minutes = Number(goal.weeklyTargetMinutes);
    if (!Number.isFinite(minutes) || minutes < 0) {
      throw new Error(`Invalid Goal weeklyTargetMinutes for ${normalized}: expected >= 0.`);
    }
  }
}

function assertTemplate(template: GoalTemplateStorageRow, goalPaths: Set<string>): void {
  const goalPath = normalizeGoalPath(template.goalPath);
  if (!goalPath || !goalPaths.has(goalPath)) throw new Error(`GoalTemplate references missing Goal (${template.goalPath || '<empty>'}).`);
  for (const key of Object.keys(template.defaultValues || {})) {
    if (GOAL_CONTEXT_KEYS.has(key)) throw new Error(`GoalTemplate ${goalPath}/${template.recordTypeId} must not persist Goal context defaults (${key}).`);
    if (GOAL_TEMPLATE_ICON_KEYS.has(key)) throw new Error(`GoalTemplate ${goalPath}/${template.recordTypeId} must not persist Goal identity icon defaults (${key}).`);
  }
  for (const field of template.fields || []) {
    const semantic = String((field as any).semantic || '').trim();
    const key = String((field as any).key || (field as any).label || '').trim();
    if (semantic === 'goalPath' || GOAL_CONTEXT_KEYS.has(key)) {
      throw new Error(`GoalTemplate ${goalPath}/${template.recordTypeId} must not persist Goal context field (${key || semantic}).`);
    }
    if ((semantic === 'icon' || GOAL_TEMPLATE_ICON_KEYS.has(key)) && String((field as any).defaultValue ?? '').trim()) {
      throw new Error(`GoalTemplate ${goalPath}/${template.recordTypeId} must not persist an icon field default.`);
    }
  }
}

export function assertCanonicalGoalSettings(goalSettings: GoalSettings | undefined): void {
  const goals = goalSettings?.goals || [];
  for (const goal of goals) assertGoal(goal);
  const paths = new Set(goals.map((goal) => goal.path));
  if (paths.size !== goals.length) throw new Error('Duplicate Goal path detected.');
  const templateKeys = new Set<string>();
  for (const template of goalSettings?.goalTemplates || []) {
    assertTemplate(template, paths);
    const key = `${template.goalPath}::${template.recordTypeId}`;
    if (templateKeys.has(key)) throw new Error(`Duplicate GoalTemplate detected (${key}).`);
    templateKeys.add(key);
  }
}
