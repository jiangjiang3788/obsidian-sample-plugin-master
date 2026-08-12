import type { GoalDefinition, GoalSettings, GoalTemplateStorageRow } from './types';
import { normalizeGoalPath } from './path';

const GOAL_DEFAULT_KEYS = new Set(['goalId', '目标ID', 'goalPath', '目标', '目标路径']);

function hasHash(value: unknown): boolean {
  const text = String(value ?? '');
  return text.includes('#') || text.includes('＃');
}

function assertGoal(goal: GoalDefinition): void {
  if (!goal.id || !String(goal.id).startsWith('goal.')) throw new Error(`Invalid Goal id: ${goal.id || '<empty>'}`);
  if (!goal.title?.trim() || hasHash(goal.title)) throw new Error(`Invalid Goal title for ${goal.id}: Goal title must not contain #.`);
  const normalized = normalizeGoalPath(goal.goalPath || goal.title);
  if (!normalized || normalized !== String(goal.goalPath || '').trim()) {
    throw new Error(`Invalid Goal path for ${goal.id}: expected canonical slash path without #.`);
  }
}

function assertTemplate(template: GoalTemplateStorageRow, goalIds: Set<string>): void {
  if (!goalIds.has(template.goalId)) throw new Error(`GoalTemplate ${template.id} references missing Goal (${template.goalId}).`);
  for (const key of Object.keys(template.defaultValues || {})) {
    if (GOAL_DEFAULT_KEYS.has(key)) throw new Error(`GoalTemplate ${template.id} must not persist Goal defaults (${key}).`);
  }
  for (const field of template.fields || []) {
    const semantic = String((field as any).semantic || '').trim();
    const key = String((field as any).key || (field as any).label || '').trim();
    if ((semantic === 'goalId' || semantic === 'goalPath' || GOAL_DEFAULT_KEYS.has(key)) && (field as any).defaultValue != null) {
      throw new Error(`GoalTemplate ${template.id} must not persist Goal field defaultValue (${key || semantic}).`);
    }
  }
}

export function assertCanonicalGoalSettings(goalSettings: GoalSettings | undefined): void {
  const goals = goalSettings?.goals || [];
  for (const goal of goals) assertGoal(goal);
  const goalIds = new Set(goals.map((goal) => goal.id));
  for (const template of goalSettings?.goalTemplates || []) assertTemplate(template, goalIds);
}
