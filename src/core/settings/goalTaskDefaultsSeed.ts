import type { ThinkSettings } from './ThinkSettings';
export const GOAL_TASK_DEFAULTS_SEED_VERSION = 1;
const TASK_DEFAULT_KEYS = new Set([
  'brainDemand',
  'physicalDemand',
  'importance',
  'urgency',
  'priority',
  'availabilityContexts',
  'recurrenceUnit',
]);
type GoalTaskDefaultsSeedRow = readonly [
  goalPath: string,
  brainDemand: string,
  physicalDemand: string,
  importance: string,
  urgency: string,
  priority: string,
  availabilityContexts: readonly string[],
  recurrenceUnit: string,
];
const GOAL_TASK_DEFAULTS_ROWS: readonly GoalTaskDefaultsSeedRow[] = [
  ["照顾好自己/身体", "low", "low", "important", "urgent", "medium", ["any"], "day"],
  ["了解自我/专注", "high", "low", "important", "normal", "highest", ["work"], "month"],
  ["照顾好自己/睡眠", "low", "low", "important", "urgent", "medium", ["any"], "day"],
  ["照顾好自己/早餐", "low", "low", "important", "urgent", "medium", ["any"], "day"],
  ["照顾好自己/午餐", "low", "low", "important", "urgent", "medium", ["any"], "day"],
  ["照顾好自己/晚餐", "low", "low", "important", "urgent", "medium", ["any"], "day"],
  ["照顾好自己/健康", "low", "low", "important", "urgent", "medium", ["any"], "day"],
  ["照顾好自己/粑粑", "low", "low", "important", "urgent", "medium", ["any"], "day"],
  ["照顾好自己/运动", "medium", "medium", "important", "urgent", "medium", ["any"], "day"],
  ["照顾好自己/习惯", "low", "low", "important", "urgent", "medium", ["any"], "day"],
  ["我若安好便是晴天/生活", "low", "low", "normal", "normal", "high", ["any"], "day"],
  ["我若安好便是晴天/娱乐", "low", "low", "normal", "normal", "high", ["any"], "day"],
  ["我若安好便是晴天/车车", "low", "low", "normal", "normal", "high", ["home"], "day"],
  ["我若安好便是晴天/高级生活", "medium", "low", "important", "normal", "high", ["any"], "day"],
  ["我若安好便是晴天/小手机", "low", "low", "important", "normal", "high", ["any"], "day"],
  ["我若安好便是晴天/家务", "low", "high", "normal", "normal", "high", ["home"], "day"],
  ["我若安好便是晴天/整理", "low", "high", "normal", "normal", "high", ["home"], "day"],
  ["我若安好便是晴天/收纳", "low", "high", "normal", "normal", "high", ["home"], "day"],
  ["仪容仪表/剪指甲", "low", "low", "normal", "urgent", "lowest", ["home"], "week"],
  ["仪容仪表/剪头发", "low", "low", "normal", "urgent", "lowest", ["out"], "week"],
  ["仪容仪表/卫生", "low", "low", "normal", "urgent", "lowest", ["home"], "week"],
  ["了解自我/自我", "high", "low", "important", "normal", "highest", ["work"], "month"],
  ["武装大脑/时间整理", "high", "medium", "important", "normal", "highest", ["any"], "month"],
  ["我若安好便是晴天/垚垚", "medium", "medium", "important", "normal", "high", ["any"], "day"],
  ["了解世界/阳阳", "high", "low", "important", "normal", "highest", ["work"], "month"],
  ["了解世界/婆婆", "high", "low", "important", "normal", "highest", ["work"], "month"],
  ["了解世界/家庭", "high", "low", "important", "normal", "highest", ["work"], "month"],
  ["工作能力/老板任务", "medium", "medium", "important", "urgent", "low", ["work"], "none"],
  ["工作能力/其他", "medium", "medium", "normal", "urgent", "low", ["work"], "none"],
  ["工作能力/手续、对账", "medium", "medium", "normal", "urgent", "low", ["work"], "none"],
  ["工作能力/投标", "high", "medium", "important", "urgent", "low", ["work"], "none"],
  ["工作能力/设计", "high", "medium", "important", "urgent", "low", ["work"], "none"],
  ["工作能力", "medium", "medium", "normal", "urgent", "low", ["work"], "none"],
  ["工作能力/通勤", "low", "medium", "normal", "urgent", "low", ["commute"], "none"],
  ["爱好能力/电脑", "medium", "medium", "important", "normal", "highest", ["any"], "none"],
  ["爱好能力/ob基础", "medium", "medium", "important", "normal", "highest", ["any"], "none"],
  ["爱好能力/笔记系统", "medium", "medium", "important", "normal", "highest", ["any"], "none"],
  ["爱好能力/记录系统", "medium", "medium", "important", "normal", "highest", ["any"], "none"],
  ["爱好能力/整理", "medium", "medium", "important", "normal", "highest", ["any"], "none"],
  ["爱好能力/AI", "medium", "medium", "important", "normal", "highest", ["any"], "none"],
  ["武装大脑/思路整理", "high", "medium", "important", "normal", "highest", ["any"], "month"],
  ["武装大脑/复盘整理", "high", "medium", "important", "normal", "highest", ["any"], "month"],
  ["武装大脑/读书", "high", "medium", "important", "normal", "highest", ["any"], "month"],
  ["武装大脑", "high", "medium", "important", "normal", "highest", ["any"], "month"],
  ["武装大脑/整理笔记", "high", "medium", "important", "normal", "highest", ["any"], "month"],
];

const GOAL_TASK_DEFAULTS_SEED: Record<string, Record<string, unknown>> = Object.fromEntries(
  GOAL_TASK_DEFAULTS_ROWS.map(([goalPath, brainDemand, physicalDemand, importance, urgency, priority, availabilityContexts, recurrenceUnit]) => [
    goalPath,
    { brainDemand, physicalDemand, importance, urgency, priority, availabilityContexts: [...availabilityContexts], recurrenceUnit },
  ]),
);

export interface GoalTaskDefaultsSeedResult {
  settings: ThinkSettings;
  changed: boolean;
  appliedTemplateCount: number;
}

/**
 * One-time personal-settings seed for the Goal -> Task defaults authored in 1.0.67.
 *
 * Shipping data.json in a source/update archive does not merge that file into an
 * already-installed Obsidian plugin's user data. This migration applies the seed
 * to the currently loaded direct core.task GoalTemplates exactly once, then stores
 * a version marker so later user edits are never re-applied/overwritten.
 */
export function applyGoalTaskDefaultsSeed(settings: ThinkSettings): GoalTaskDefaultsSeedResult {
  const currentVersion = Number(settings.goalTaskDefaultsSeedVersion || 0);
  if (currentVersion >= GOAL_TASK_DEFAULTS_SEED_VERSION) {
    return { settings, changed: false, appliedTemplateCount: 0 };
  }

  let appliedTemplateCount = 0;
  const goalSettings = settings.goalSettings || { goals: [], goalTemplates: [] };
  const goalTemplates = (goalSettings.goalTemplates || []).map((template) => {
    if (template.recordTypeId !== 'core.task' || template.enabled === false) return template;
    const seeded = GOAL_TASK_DEFAULTS_SEED[template.goalPath];
    if (!seeded) return template;

    const currentDefaults = { ...(template.defaultValues || {}) };
    const nextDefaults = { ...currentDefaults };
    let templateChanged = false;
    for (const key of TASK_DEFAULT_KEYS) {
      if (!(key in seeded)) continue;
      const nextValue = seeded[key];
      if (JSON.stringify(currentDefaults[key]) === JSON.stringify(nextValue)) continue;
      nextDefaults[key] = Array.isArray(nextValue) ? [...nextValue] : nextValue;
      templateChanged = true;
    }
    if (!templateChanged) return template;
    appliedTemplateCount += 1;
    return { ...template, defaultValues: nextDefaults };
  });

  return {
    settings: {
      ...settings,
      goalTaskDefaultsSeedVersion: GOAL_TASK_DEFAULTS_SEED_VERSION,
      goalSettings: { ...goalSettings, goalTemplates },
    },
    changed: true,
    appliedTemplateCount,
  };
}
