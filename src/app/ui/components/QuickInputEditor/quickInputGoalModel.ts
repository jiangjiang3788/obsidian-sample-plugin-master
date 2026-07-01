import type { GoalDefinition } from '@core/goal/public';
import type { ThinkSettings } from '@core/types/public';
import { asUnknownRecord, readNumber } from '@core/utils/public';
import { getGoalTemplates, splitGoalPath } from '@core/goal/public';

import type { GoalSelectorOption } from "./components/GoalSelector";
import type { QuickInputFieldSource, QuickInputFieldSourceMap, QuickInputFormData } from "./model/types";
import { isMeaningfulValue } from "./quickInputFieldSourceModel";
import { cleanDisplayPath, cleanDisplaySegment, getGoalPath, makeGoalIdFromPath } from "./quickInputPathModel";

function getOrderedGoalIndex(
  goal: GoalDefinition | null,
  originalIndex: Map<string, number>,
): number {
  if (!goal) return Number.MAX_SAFE_INTEGER;
  const order = readNumber(asUnknownRecord(goal), "sortOrder") ?? Number.NaN;
  return Number.isFinite(order)
    ? order
    : (originalIndex.get(goal.id) ?? Number.MAX_SAFE_INTEGER);
}

function getGoalByDisplayPath(
  goals: GoalDefinition[],
  path: string,
): GoalDefinition | null {
  return goals.find((goal) => getGoalPath(goal) === path) || null;
}

function sortGoalsLikePresetMatrix(goals: GoalDefinition[]): GoalDefinition[] {
  const originalIndex = new Map(goals.map((goal, index) => [goal.id, index]));
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
      (originalIndex.get(left.id) ?? 0) - (originalIndex.get(right.id) ?? 0)
    );
  });
}

function goalHasDirectEnabledPreset(
  fullSettings: ThinkSettings,
  goal: GoalDefinition,
  coreBlockId: string,
): boolean {
  if (!goal?.id || !coreBlockId) return false;
  return getGoalTemplates(fullSettings.goalSettings).some(
    (template) =>
      template.enabled !== false &&
      template.goalId === goal.id &&
      template.coreBlockId === coreBlockId,
  );
}

export function buildQuickInputGoalOptions(
  fullSettings: ThinkSettings,
  coreBlockId: string,
): GoalSelectorOption[] {
  const seen = new Set<string>();
  const sourceGoals = sortGoalsLikePresetMatrix([
    ...(fullSettings.goalSettings?.goals || []),
  ])
    .filter((goal) => goal.status !== "archived")
    .filter((goal) =>
      goalHasDirectEnabledPreset(fullSettings, goal, coreBlockId),
    );

  const result: GoalSelectorOption[] = [];
  for (const [index, goal] of sourceGoals.entries()) {
    const normalized = cleanDisplayPath(goal.goalPath || goal.title);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    const leaf = normalized.split("/").filter(Boolean).pop() || normalized;
    result.push({
      id: goal.id || makeGoalIdFromPath(normalized),
      value: normalized,
      label: cleanDisplaySegment(goal.title) || leaf,
      order: index,
      goal,
      themePath: goal.themePath ?? null,
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
  const goalPath =
    cleanDisplayPath(goal?.goalPath || option.value) || option.value;
  const goalId =
    goal?.id ||
    (option.id && !String(option.id).startsWith("goal:")
      ? option.id
      : makeGoalIdFromPath(goalPath));
  const themePath = goal?.themePath || option.themePath || null;
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

  assign("goalId", goalId);
  assign("目标ID", goalId);
  assign("goalPath", goalPath);
  assign("目标", goalPath);
  const parts = splitGoalPath(cleanDisplayPath(goalPath) || "");
  assign("rootGoal", parts.rootGoal || "", "goal_context");
  assign("leafGoal", parts.leafGoal || "", "goal_context");
  if (themePath) {
    assign("themePath", themePath, "goal_context");
    assign("主题", themePath, "goal_context");
  }

  return {
    goal,
    goalId,
    goalPath,
    themePath,
    formData: nextFormData,
    fieldSources: nextFieldSources,
  };
}
