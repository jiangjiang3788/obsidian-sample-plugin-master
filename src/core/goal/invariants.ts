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
  if (hasHash(raw)) throw new Error(`目标路径无效（${raw}）：目标路径不能包含 #。`);
  const normalized = normalizeGoalPath(raw);
  if (!normalized) throw new Error('目标无效：必须使用规范的斜杠分隔路径。');
  if (goal.path !== normalized) throw new Error(`目标路径无效：应为 ${normalized}。`);
  if (goal.timePresetPercent !== undefined) {
    const percent = Number(goal.timePresetPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      throw new Error(`目标 ${normalized} 的时间预设百分比无效：必须在 0 到 100 之间。`);
    }
  }
  if (goal.weeklyTargetMinutes !== undefined) {
    const minutes = Number(goal.weeklyTargetMinutes);
    if (!Number.isFinite(minutes) || minutes < 0) {
      throw new Error(`目标 ${normalized} 的每周目标分钟数无效：必须大于等于 0。`);
    }
  }
}

function assertTemplate(template: GoalTemplateStorageRow, goalPaths: Set<string>): void {
  const goalPath = normalizeGoalPath(template.goalPath);
  if (!goalPath || !goalPaths.has(goalPath)) throw new Error(`目标模板引用了不存在的目标（${template.goalPath || '空'}）。`);
  for (const key of Object.keys(template.defaultValues || {})) {
    if (GOAL_CONTEXT_KEYS.has(key)) throw new Error(`目标模板 ${goalPath}/${template.recordTypeId} 不能保存目标上下文默认值（${key}）。`);
    if (GOAL_TEMPLATE_ICON_KEYS.has(key)) throw new Error(`目标模板 ${goalPath}/${template.recordTypeId} 不能保存目标身份图标默认值（${key}）。`);
  }
  for (const field of template.fields || []) {
    const semantic = String((field as any).semantic || '').trim();
    const key = String((field as any).key || (field as any).label || '').trim();
    if (semantic === 'goalPath' || GOAL_CONTEXT_KEYS.has(key)) {
      throw new Error(`目标模板 ${goalPath}/${template.recordTypeId} 不能保存目标上下文字段（${key || semantic}）。`);
    }
    if ((semantic === 'icon' || GOAL_TEMPLATE_ICON_KEYS.has(key)) && String((field as any).defaultValue ?? '').trim()) {
      throw new Error(`目标模板 ${goalPath}/${template.recordTypeId} 不能保存图标字段默认值。`);
    }
  }
}

export function assertCanonicalGoalSettings(goalSettings: GoalSettings | undefined): void {
  const goals = goalSettings?.goals || [];
  for (const goal of goals) assertGoal(goal);
  const paths = new Set(goals.map((goal) => goal.path));
  if (paths.size !== goals.length) throw new Error('检测到重复的目标路径。');
  const templateKeys = new Set<string>();
  for (const template of goalSettings?.goalTemplates || []) {
    assertTemplate(template, paths);
    const key = `${template.goalPath}::${template.recordTypeId}`;
    if (templateKeys.has(key)) throw new Error(`检测到重复的目标模板（${key}）。`);
    templateKeys.add(key);
  }
}
