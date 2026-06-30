import type {
  QuickInputFieldSource,
  QuickInputFieldSourceMap,
  QuickInputFormData,
  QuickInputOptionLike,
} from "./QuickInputEditorModel";

export const isMeaningfulValue = (value: unknown) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value !== "";
  return true;
};

export const isOptionLike = (value: unknown): value is QuickInputOptionLike =>
  !!value && typeof value === "object" && "value" in value && "label" in value;

export const isSameValue = (a: unknown, b: unknown) => {
  if (isOptionLike(a) && isOptionLike(b)) {
    return a.value === b.value && a.label === b.label;
  }
  return a === b;
};

export const isRefreshableSource = (source?: QuickInputFieldSource) =>
  source === undefined ||
  source === "template_default" ||
  source === "system_auto" ||
  source === "goal_context" ||
  source === "theme_context";

export const buildInitialFieldSources = (
  initialData?: QuickInputFormData,
): QuickInputFieldSourceMap => {
  const next: QuickInputFieldSourceMap = {};
  if (!initialData) return next;
  Object.keys(initialData).forEach((key) => {
    if (key === "__timeDirection" || key === "lastChanged") return;
    if (!isMeaningfulValue(initialData[key])) return;
    next[key] = "context";
  });
  return next;
};

export const buildFieldSourceSummary = (
  sources: QuickInputFieldSourceMap,
): Record<QuickInputFieldSource, number> => ({
  user: Object.values(sources).filter((v) => v === "user").length,
  context: Object.values(sources).filter((v) => v === "context").length,
  edit_backfill: Object.values(sources).filter((v) => v === "edit_backfill")
    .length,
  invocation_context: Object.values(sources).filter(
    (v) => v === "invocation_context",
  ).length,
  goal_context: Object.values(sources).filter((v) => v === "goal_context")
    .length,
  theme_context: Object.values(sources).filter((v) => v === "theme_context")
    .length,
  template_default: Object.values(sources).filter(
    (v) => v === "template_default",
  ).length,
  system_auto: Object.values(sources).filter((v) => v === "system_auto").length,
});

const QUICK_INPUT_GOAL_CONTEXT_KEYS = [
  "goalId",
  "目标ID",
  "goalPath",
  "目标",
  "rootGoal",
  "leafGoal",
  "cycleId",
  "周期ID",
  "周期",
  "周期粒度",
  "templateId",
  "goalTemplateId",
  "templateVariantId",
  "goalTemplateVariantId",
];

const QUICK_INPUT_BLOCK_SWITCH_PRESERVE_KEYS = [
  "内容",
  "content",
  "日期",
  "date",
  "时间",
  "time",
  "备注",
  "note",
  "description",
  "目标",
  "目标ID",
  "goalId",
  "goalPath",
  "themePath",
  "主题",
];

export function clearQuickInputGoalContext(
  formData: QuickInputFormData,
  fieldSources: QuickInputFieldSourceMap,
) {
  const nextFormData = { ...formData };
  const nextFieldSources = { ...fieldSources };
  QUICK_INPUT_GOAL_CONTEXT_KEYS.forEach((key) => {
    delete nextFormData[key];
    delete nextFieldSources[key];
  });
  return { formData: nextFormData, fieldSources: nextFieldSources };
}

export function preserveQuickInputBlockSwitchState(
  formData: QuickInputFormData,
  fieldSources: QuickInputFieldSourceMap,
) {
  const preservedFormData: QuickInputFormData = {};
  const preservedFieldSources: QuickInputFieldSourceMap = {};
  QUICK_INPUT_BLOCK_SWITCH_PRESERVE_KEYS.forEach((key) => {
    if (formData[key] !== undefined) preservedFormData[key] = formData[key];
    if (fieldSources[key]) preservedFieldSources[key] = fieldSources[key];
  });
  return { formData: preservedFormData, fieldSources: preservedFieldSources };
}
