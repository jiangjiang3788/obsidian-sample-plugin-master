import { dayjs } from '@core/utils/public';
import { computeLinkedTimeChanges, finalizeLinkedTimeFields } from '@shared/utils/public';

import type {
  ApplyQuickInputFieldUpdateInput,
  ApplyQuickInputTimeDirectionChangeInput,
  QuickInputFieldSourceMap,
  QuickInputFormData,
  QuickInputOptionLike,
  TimeDirection,
} from "./model/types";
import { normalizeGoalPath } from '@core/goal/public';

/** 将“时间/结束/时长”字段收敛成最终数据，并去掉编辑态元字段。 */
export function finalizeQuickInputFormData(formData: QuickInputFormData) {
  const finalData = { ...formData };
  const direction =
    finalData.__timeDirection === "backward" ? "backward" : "forward";
  delete finalData.lastChanged;
  delete finalData.__timeDirection;
  return finalizeLinkedTimeFields(
    finalData,
    { startKey: "时间", endKey: "结束", durationKey: "时长" },
    { durationOutput: "number", direction },
  );
}

export function applyQuickInputLinkedTimeChanges(
  draft: QuickInputFormData,
  direction: TimeDirection,
) {
  const changes = computeLinkedTimeChanges(
    draft,
    { startKey: "时间", endKey: "结束", durationKey: "时长" },
    typeof draft.lastChanged === 'string' ? draft.lastChanged : undefined,
    {
      durationOutput: "number",
      direction,
    },
  );
  if (!Object.keys(changes).length) {
    const cleaned = { ...draft };
    if ("lastChanged" in cleaned) delete cleaned.lastChanged;
    return { formData: cleaned, autoKeys: [] as string[] };
  }
  const merged = { ...draft, ...changes };
  if ("lastChanged" in merged) delete merged.lastChanged;
  return { formData: merged, autoKeys: Object.keys(changes) };
}

export function applyQuickInputFieldUpdate(
  input: ApplyQuickInputFieldUpdateInput,
) {
  const {
    formData,
    fieldSources,
    key,
    value,
    isOptionObject = false,
    timeDirection,
  } = input;
  const optionValue = value as QuickInputOptionLike | undefined;
  const rawValue = isOptionObject ? optionValue?.value : value;
  const fieldValue = isOptionObject
    ? { value: optionValue?.value, label: optionValue?.label }
    : value;
  const draft = { ...formData, [key]: fieldValue, lastChanged: key };
  const linked = applyQuickInputLinkedTimeChanges(draft, timeDirection);
  const nextSources: QuickInputFieldSourceMap = {
    ...fieldSources,
    [key]: "user",
  };
  linked.autoKeys.forEach((autoKey) => {
    if (autoKey !== key) nextSources[autoKey] = "system_auto";
  });

  const nextThemePath =
    key === "themePath" || key === "主题"
      ? String(rawValue ?? "").trim() || null
      : undefined;
  const nextGoalPath =
    key === "goalPath" || key === "目标" || key === "目标路径"
      ? normalizeGoalPath(String(rawValue ?? ""))
      : undefined;

  return {
    formData: linked.formData,
    fieldSources: nextSources,
    nextThemePath,
    nextGoalPath,
    // Goal identity only comes from GoalSelector / GoalDefinition. A manual path
    // edit invalidates the selected entity instead of fabricating an id from text.
    nextGoalId: nextGoalPath === undefined ? undefined : null,
  };
}

export function applyQuickInputTimeDirectionChange(
  input: ApplyQuickInputTimeDirectionChangeInput,
) {
  const { formData, fieldSources, nextDirection } = input;
  const draft = { ...formData };
  let usedDefaultEnd = false;
  if (nextDirection === "backward" && !draft["结束"]) {
    draft["结束"] = input.defaultEndTime || dayjs().format("HH:mm");
    usedDefaultEnd = true;
  }
  const linked = applyQuickInputLinkedTimeChanges(draft, nextDirection);
  const nextSources: QuickInputFieldSourceMap = { ...fieldSources };
  if (usedDefaultEnd && !fieldSources["结束"])
    nextSources["结束"] = "system_auto";
  linked.autoKeys.forEach((autoKey) => {
    nextSources[autoKey] = "system_auto";
  });
  return {
    formData: linked.formData,
    fieldSources: nextSources,
    timeDirection: nextDirection,
  };
}
