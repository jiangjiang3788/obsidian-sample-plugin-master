import type { GoalDefinition } from '@core/goal/public';
import type { ThinkSettings } from '@core/types/public';
import { asUnknownRecord, readNumber } from '@core/utils/public';
import { getGoalTemplates, normalizeGoalPath, splitGoalPath } from '@core/goal/public';

import type { GoalSelectorOption } from "./components/GoalSelector";
import type { QuickInputFieldSource, QuickInputFieldSourceMap, QuickInputFormData } from "./model/types";
import { isMeaningfulValue } from "./quickInputFieldSourceModel";
import { getGoalPath } from "./quickInputPathModel";

function getOrderedGoalIndex(
  goal: GoalDefinition | null,
  originalIndex: Map<string, number>,
): number {
  if (!goal) return Number.MAX_SAFE_INTEGER;
  const order = readNumber(asUnknownRecord(goal), "sortOrder") ?? Number.NaN;
  return Number.isFinite(order)
    ? order
    : (originalIndex.get(goal.path) ?? Number.MAX_SAFE_INTEGER);
}

function getGoalByDisplayPath(
  goals: GoalDefinition[],
  path: string,
): GoalDefinition | null {
  return goals.find((goal) => getGoalPath(goal) === path) || null;
}

function sortGoalsLikePresetMatrix(goals: GoalDefinition[]): GoalDefinition[] {
  const originalIndex = new Map(goals.map((goal, index) => [goal.path, index]));
  return [...goals].sort((left, right) => {
    const leftParts = (getGoalPath(left) || "").split("/").filter(Boolean);
    const rightParts = (getGoalPath(right) || "").split("/").filter(Boolean);
    const max = Math.min(leftParts.length, rightParts.length);
    for (let index = 0; index < max; index += 1) {
      if (leftParts[index] === rightParts[index]) continue;
      const leftSiblingPath = [
        ...leftParts.slice(0, index),
        leftParts[index],
      ].join("/");
      const rightSiblingPath = [
        ...rightParts.slice(0, index),
        rightParts[index],
      ].join("/");
      const leftSiblingGoal = getGoalByDisplayPath(goals, leftSiblingPath);
      const rightSiblingGoal = getGoalByDisplayPath(goals, rightSiblingPath);
      const leftOrder = getOrderedGoalIndex(leftSiblingGoal, originalIndex);
      const rightOrder = getOrderedGoalIndex(rightSiblingGoal, originalIndex);
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return leftParts[index].localeCompare(rightParts[index], "zh-CN");
    }
    if (leftParts.length !== rightParts.length)
      return leftParts.length - rightParts.length;
    const byOrder =
      getOrderedGoalIndex(left, originalIndex) -
      getOrderedGoalIndex(right, originalIndex);
    if (byOrder !== 0) return byOrder;
    return (
      (originalIndex.get(left.path) ?? 0) - (originalIndex.get(right.path) ?? 0)
    );
  });
}

function goalHasDirectEnabledPreset(
  fullSettings: ThinkSettings,
  goal: GoalDefinition,
  coreBlockId: string,
): boolean {
  const goalPath = normalizeGoalPath(goal?.path);
  if (!goalPath || !coreBlockId) return false;
  return getGoalTemplates(fullSettings.goalSettings).some(
    (template) =>
      template.enabled !== false &&
      template.goalPath === goalPath &&
      template.coreBlockId === coreBlockId,
  );
}

export function buildQuickInputGoalOptions(
  fullSettings: ThinkSettings,
  coreBlockId: string,
  options: { requirePreset?: boolean } = {},
): GoalSelectorOption[] {
  const seen = new Set<string>();
  const requirePreset = options.requirePreset !== false;
  const sourceGoals = sortGoalsLikePresetMatrix([
    ...(fullSettings.goalSettings?.goals || []),
  ])
    .filter((goal) => goal.status !== "archived")
    .filter((goal) => !requirePreset || goalHasDirectEnabledPreset(fullSettings, goal, coreBlockId));

  const result: GoalSelectorOption[] = [];
  for (const [index, goal] of sourceGoals.entries()) {
    const normalized = normalizeGoalPath(goal.path);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    const leaf = normalized.split("/").filter(Boolean).pop() || normalized;
    result.push({
      id: normalized,
      value: normalized,
      label: leaf,
      order: index,
      goal,
    });
  }
  return result;
}

export function resolveQuickInputCoreBlockId(
  _fullSettings: ThinkSettings,
  blockId: string,
): string {
  return String(blockId || "");
}

export function applyQuickInputGoalSelection(params: {
  formData: QuickInputFormData;
  fieldSources: QuickInputFieldSourceMap;
  option: GoalSelectorOption;
}) {
  const { formData, fieldSources, option } = params;
  const goal = option.goal || null;
  const goalPath = normalizeGoalPath(goal?.path || option.value);
  if (!goalPath) throw new Error('QuickInput Goal selection requires a canonical Goal path.');
  const nextFormData = { ...formData };
  const nextFieldSources: QuickInputFieldSourceMap = { ...fieldSources };
  const assign = (
    key: string,
    value: unknown,
    source: QuickInputFieldSource = "goal_context",
  ) => {
    if (value === undefined || value === null || value === "") return;
    const currentSource = nextFieldSources[key];
    const hasUserValue =
      currentSource === "user" && isMeaningfulValue(nextFormData[key]);
    if (hasUserValue) return;
    nextFormData[key] = value;
    nextFieldSources[key] = source;
  };

  assign("goalPath", goalPath);
  assign("目标", goalPath);
  const parts = splitGoalPath(goalPath);
  assign("rootGoal", parts.rootGoal || "", "goal_context");
  assign("leafGoal", parts.leafGoal || "", "goal_context");
  return {
    goal,
    goalPath,
    formData: nextFormData,
    fieldSources: nextFieldSources,
  };
}

export function resolveQuickInputEnergyDefaultGoal(
  goals: GoalSelectorOption[],
  defaultGoalPath?: string | null,
): GoalSelectorOption | null {
  if (goals.length === 0) return null;
  const preferredPath = String(defaultGoalPath || '').trim();
  if (preferredPath) {
    const preferred = goals.find((option) => option.value === preferredPath || option.goal?.path === preferredPath);
    if (preferred) return preferred;
  }
  return goals[0] || null;
}

