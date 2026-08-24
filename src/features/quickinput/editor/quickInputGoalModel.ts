import type { GoalDefinition } from '@core/goal/public';
import { getGoalTemplates } from '@core/goal/public';
import { getCreateEligibleGoalPaths } from '@core/recordInput/public';
import type { ThinkSettings } from '@core/types/public';
import { asUnknownRecord, readNumber } from '@core/utils/public';
import { normalizeGoalPath, splitGoalPath } from '@core/goal/public';

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

export function buildQuickInputGoalOptions(
  fullSettings: ThinkSettings,
  recordTypeId?: string | null,
  requireDirectTemplate = false,
): GoalSelectorOption[] {
  const seen = new Set<string>();
  const templates = getGoalTemplates(fullSettings.goalSettings);
  const enabledTemplateGoalPaths = new Set(
    recordTypeId ? getCreateEligibleGoalPaths(fullSettings, recordTypeId) : [],
  );
  const disabledGoalPaths = new Set(
    recordTypeId
      ? templates
          .filter((template) => template.recordTypeId === recordTypeId && template.enabled === false)
          .map((template) => normalizeGoalPath(template.goalPath) || '')
          .filter(Boolean)
      : [],
  );
  const navigationGoalPaths = new Set<string>();
  if (requireDirectTemplate && recordTypeId) {
    for (const path of enabledTemplateGoalPaths) {
      const parts = path.split('/').filter(Boolean);
      for (let index = 1; index <= parts.length; index += 1) {
        navigationGoalPaths.add(parts.slice(0, index).join('/'));
      }
    }
  }
  const sourceGoals = sortGoalsLikePresetMatrix([
    ...(fullSettings.goalSettings?.goals || []),
  ]).filter((goal) => {
    if (goal.status === "archived") return false;
    const path = normalizeGoalPath(goal.path) || '';
    if (!path || disabledGoalPaths.has(path)) return false;
    if (requireDirectTemplate && recordTypeId) return navigationGoalPaths.has(path);
    return true;
  });

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
      synthetic: requireDirectTemplate && !!recordTypeId && !enabledTemplateGoalPaths.has(normalized),
    });
  }
  return result;
}

export function resolveQuickInputRecordTypeId(
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

  // Keep desktop QuickInput aligned with the public Energy protocol and settings copy:
  // an empty/stale default means “use the first active Goal”, then any available Goal.
  return goals.find((option) => option.goal?.status === 'active') || goals[0] || null;
}

