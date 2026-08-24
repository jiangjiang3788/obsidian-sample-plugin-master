import type { GoalDefinition, GoalSettings, GoalTemplateStorageRow } from './types';
import { normalizeGoalPath } from './path';

const GOAL_CONTEXT_KEYS = new Set(['goalPath', '目标', '目标路径']);

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
}

function assertTemplate(template: GoalTemplateStorageRow, goalPaths: Set<string>): void {
  const goalPath = normalizeGoalPath(template.goalPath);
  if (!goalPath || !goalPaths.has(goalPath)) throw new Error(`GoalTemplate references missing Goal (${template.goalPath || '<empty>'}).`);
  for (const key of Object.keys(template.defaultValues || {})) {
    if (GOAL_CONTEXT_KEYS.has(key)) throw new Error(`GoalTemplate ${goalPath}/${template.recordTypeId} must not persist Goal context defaults (${key}).`);
  }
  for (const field of template.fields || []) {
    const semantic = String((field as any).semantic || '').trim();
    const key = String((field as any).key || (field as any).label || '').trim();
    if (semantic === 'goalPath' || GOAL_CONTEXT_KEYS.has(key)) {
      throw new Error(`GoalTemplate ${goalPath}/${template.recordTypeId} must not persist Goal context field (${key || semantic}).`);
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
