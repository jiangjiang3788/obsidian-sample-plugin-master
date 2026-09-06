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

function linkedTimeKeysFor(
  data: QuickInputFormData,
  changedKey?: string | null,
  preferredFieldSet?: 'task' | 'legacy',
) {
  if (preferredFieldSet === 'task') return TASK_TIME_KEYS;
  if (preferredFieldSet === 'legacy') return LEGACY_TIME_KEYS;
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

  const nextGoalPath =
    key === "goalPath" || key === "目标" || key === "目标路径"
      ? normalizeGoalPath(String(rawValue ?? ""))
      : undefined;

  return {
    formData: linked.formData,
    fieldSources: nextSources,
    nextGoalPath,
  };
}

export function applyQuickInputTimeDirectionChange(
  input: ApplyQuickInputTimeDirectionChangeInput,
) {
  const { formData, fieldSources, nextDirection } = input;
  const keys = linkedTimeKeysFor(formData, undefined, input.timeFieldSet);
  const draft = { ...formData };
  let usedDefaultEnd = false;

  if (nextDirection === "backward") {
    if (!draft[keys.endKey]) {
      draft[keys.endKey] = input.defaultEndTime || (
        keys.endKey === TASK_TIME_KEYS.endKey
          ? dayjs().format("YYYY-MM-DDTHH:mm")
          : dayjs().format("HH:mm")
      );
      usedDefaultEnd = true;
    }

    // 切换到“反向”本身就表示：
    // 以结束时间（缺省为当前时间）和时长为真源，重新推导开始时间。
    if (draft[keys.durationKey] !== undefined && draft[keys.durationKey] !== null && draft[keys.durationKey] !== '') {
      draft.lastChanged = keys.durationKey;
    }
  }

  const changedKey = typeof draft.lastChanged === 'string' ? draft.lastChanged : undefined;
  const changes = computeLinkedTimeChanges(
    draft,
    keys,
    changedKey,
    { durationOutput: "number", direction: nextDirection },
  );
  const merged = { ...draft, ...changes };
  if ("lastChanged" in merged) delete merged.lastChanged;

  const nextSources: QuickInputFieldSourceMap = { ...fieldSources };
  if (usedDefaultEnd && !fieldSources[keys.endKey]) {
    nextSources[keys.endKey] = "system_auto";
  }
  Object.keys(changes).forEach((autoKey) => {
    if (autoKey !== keys.endKey || !usedDefaultEnd) nextSources[autoKey] = "system_auto";
  });

  return {
    formData: merged,
    fieldSources: nextSources,
    timeDirection: nextDirection,
  };
}
