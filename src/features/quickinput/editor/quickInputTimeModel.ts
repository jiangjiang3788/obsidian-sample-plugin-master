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

const LEGACY_TIME_KEYS = { startKey: "时间", endKey: "结束", durationKey: "时长" } as const;
const TASK_TIME_KEYS = { startKey: "startAt", endKey: "endAt", durationKey: "expectedDurationMinutes" } as const;

function usesTaskDateTimeFields(data: QuickInputFormData, changedKey?: string | null): boolean {
  if (changedKey && Object.values(TASK_TIME_KEYS).includes(changedKey as any)) return true;
  return Object.values(TASK_TIME_KEYS).some((key) => Object.prototype.hasOwnProperty.call(data, key));
}

function linkedTimeKeysFor(data: QuickInputFormData, changedKey?: string | null) {
  return usesTaskDateTimeFields(data, changedKey) ? TASK_TIME_KEYS : LEGACY_TIME_KEYS;
}

/**
 * 将“开始 / 结束 / 时长”收敛成最终数据，并去掉编辑态元字段。
 * Task 使用 datetime-local + expectedDurationMinutes；其他记录继续兼容旧的 时间/结束/时长。
 */
export function finalizeQuickInputFormData(formData: QuickInputFormData) {
  let finalData = { ...formData };
  const direction =
    finalData.__timeDirection === "backward" ? "backward" : "forward";
  delete finalData.lastChanged;
  delete finalData.__timeDirection;

  // 两套 key 都走同一个 linked-time policy；不存在的字段不会被凭空生成。
  finalData = finalizeLinkedTimeFields(
    finalData,
    TASK_TIME_KEYS,
    { durationOutput: "number", direction },
  );
  return finalizeLinkedTimeFields(
    finalData,
    LEGACY_TIME_KEYS,
    { durationOutput: "number", direction },
  );
}

export function applyQuickInputLinkedTimeChanges(
  draft: QuickInputFormData,
  direction: TimeDirection,
) {
  const changedKey = typeof draft.lastChanged === 'string' ? draft.lastChanged : undefined;
  const keys = linkedTimeKeysFor(draft, changedKey);
  const changes = computeLinkedTimeChanges(
    draft,
    keys,
    changedKey,
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
