import type {
  BlockTemplate,
  GoalDefinition,
  RecordInputMeta,
  RecordInputSessionMode,
  TemplateField,
  ThemeDefinition,
} from "@core/public";
import {
  dayjs,
  getLeafPath,
  getTemplateFieldSemantic,
  readFirstString,
  readRecord,
  renderTemplate,
} from "@core/public";
import { finalizeLinkedTimeFields } from "@shared/public";

import {
  buildFieldSourceSummary,
  isMeaningfulValue,
  isOptionLike,
  isRefreshableSource,
  isSameValue,
} from "./quickInputFieldSourceModel";
import { cleanDisplayPath, splitThemePathParts, themeOptions } from "./quickInputPathModel";

export {
  buildInitialFieldSources,
  clearQuickInputGoalContext,
  isMeaningfulValue,
  isOptionLike,
  isRefreshableSource,
  isSameValue,
  preserveQuickInputBlockSwitchState,
} from "./quickInputFieldSourceModel";
export {
  cleanDisplayPath,
  cleanDisplaySegment,
  getGoalPath,
  makeGoalIdFromPath,
  splitPathParts,
  splitThemePathParts,
  themeOptions,
} from "./quickInputPathModel";
export {
  applyQuickInputFieldUpdate,
  applyQuickInputLinkedTimeChanges,
  applyQuickInputTimeDirectionChange,
  finalizeQuickInputFormData,
} from "./quickInputTimeModel";
export {
  applyQuickInputGoalSelection,
  buildQuickInputGoalOptions,
  resolveQuickInputCoreBlockId,
} from "./quickInputGoalModel";

export type QuickInputFormData = Record<string, unknown>;
export type QuickInputContext = Record<string, unknown>;
export interface QuickInputOptionLike {
  value?: unknown;
  label?: unknown;
}
export type QuickInputTemplateLike = Partial<BlockTemplate> & {
  fields?: TemplateField[];
  coreBlockId?: string | null;
  variantId?: string | null;
};
export interface QuickInputPeriodLike {
  id: string;
  label: string;
  startDate?: string;
  endDate?: string;
  granularity?: string;
}
export const EMPTY_FORM_DATA: QuickInputFormData = {};

export type TimeDirection = "forward" | "backward";

/**
 * 字段值来源分层：
 * - user: 用户手动输入
 * - context/edit_backfill/invocation_context: 外部上下文或编辑态回填
 * - goal_context/theme_context: 目标或主题上下文推导
 * - template_default/system_auto: 模板默认值或系统自动值
 */
export type QuickInputFieldSource =
  | "user"
  | "context"
  | "edit_backfill"
  | "invocation_context"
  | "goal_context"
  | "theme_context"
  | "template_default"
  | "system_auto";
export type QuickInputFieldSourceMap = Record<string, QuickInputFieldSource>;

export interface QuickInputEditorState {
  blockId: string;
  coreBlockId?: string | null;
  goalId?: string | null;
  goalPath?: string | null;
  goalTitle?: string | null;
  rootGoal?: string | null;
  leafGoal?: string | null;
  cycleId?: string | null;
  themeId: string | null;
  formData: QuickInputFormData;
  template: QuickInputTemplateLike | null;
  theme: ThemeDefinition | null;
  templateId: string | null;
  templateVariantId?: string | null;
  templateSourceType: "core-block" | "goal-template" | null;
  fieldSources?: QuickInputFieldSourceMap;
  meta?: RecordInputMeta;
  /** 完整路径主题，例如：学习/英语/听力。 */
  themePath?: string | null;
  /** 根主题，例如：学习。 */
  rootTheme?: string | null;
  /** 叶主题，例如：听力。 */
  leafTheme?: string | null;
  fieldSourceSummary?: Record<QuickInputFieldSource, number>;
}

export interface QuickInputEditorProps {
  /** 用于渲染 rating 图片资源（由 platform 注入）。 */
  getResourcePath: (path: string) => string;
  initialBlockId: string;
  context?: QuickInputContext;
  initialThemeId?: string | null;
  initialFormData?: QuickInputFormData;
  recordInputMode?: RecordInputSessionMode;
  allowBlockSwitch?: boolean;
  dense?: boolean;
  showDivider?: boolean;
  onStateChange?: (state: QuickInputEditorState) => void;
  onRequestSubmit?: () => void;
  isMobileLike?: boolean;
}

export interface ApplyQuickInputFieldUpdateInput {
  formData: QuickInputFormData;
  fieldSources: QuickInputFieldSourceMap;
  key: string;
  value: QuickInputOptionLike | unknown;
  isOptionObject?: boolean;
  timeDirection: TimeDirection;
}

export interface ApplyQuickInputTimeDirectionChangeInput {
  formData: QuickInputFormData;
  fieldSources: QuickInputFieldSourceMap;
  nextDirection: TimeDirection;
  defaultEndTime?: string;
}

export interface HydrateQuickInputTemplateDefaultsInput {
  template: QuickInputTemplateLike | null;
  context?: QuickInputContext;
  current: QuickInputFormData;
  fieldSources: QuickInputFieldSourceMap;
  selectedGoal?: GoalDefinition | null;
  selectedGoalId?: string | null;
  currentGoalPath?: string | null;
  currentGoalTitle?: string | null;
  theme?: ThemeDefinition | null;
  currentPeriod?: QuickInputPeriodLike | null;
  timeDirection: TimeDirection;
}

export interface QuickInputInitialSelection {
  selectedGoalId: string | null;
  selectedGoalPath: string | null;
  selectedTemplateVariantId: string | null;
  timeDirection: TimeDirection;
}

export function hydrateQuickInputTemplateDefaults({
  template,
  context,
  current,
  fieldSources,
  selectedGoal,
  selectedGoalId,
  currentGoalPath,
  currentGoalTitle,
  theme,
  currentPeriod,
  timeDirection,
}: HydrateQuickInputTemplateDefaultsInput) {
  if (!template) return { changed: false, formData: current, fieldSources };

  const dataForParsing = {
    ...context,
    goal: {
      id: selectedGoal?.id || selectedGoalId || "",
      title: currentGoalTitle || "",
      path: currentGoalPath || "",
      themePath: selectedGoal?.themePath || theme?.path || "",
    },
    goalId: selectedGoal?.id || selectedGoalId || "",
    goalPath: currentGoalPath || "",
    ...(currentPeriod
      ? {
          period: currentPeriod,
          cycle: {
            id: currentPeriod.id,
            title: currentPeriod.label,
            startDate: currentPeriod.startDate,
            endDate: currentPeriod.endDate,
          },
          cycleId: currentPeriod.id,
          periodId: currentPeriod.id,
          periodLabel: currentPeriod.label,
        }
      : {}),
    theme: theme
      ? { path: theme.path, icon: theme.icon || "" }
      : { path: selectedGoal?.themePath || "", icon: "" },
  };

  let changed = false;
  const next: QuickInputFormData = { ...current };
  const nextSources: QuickInputFieldSourceMap = { ...fieldSources };

  const assignValue = (
    key: string,
    value: unknown,
    source: QuickInputFieldSource,
  ) => {
    if (!isSameValue(next[key], value)) {
      next[key] = value;
      changed = true;
    }
    if (nextSources[key] !== source) {
      nextSources[key] = source;
      changed = true;
    }
  };

  template.fields.forEach((field: TemplateField) => {
    const key = field.key;
    const existingValue = next[key];
    const existingSource = nextSources[key];
    const hasMeaningfulExisting = isMeaningfulValue(existingValue);
    const canRefresh =
      !hasMeaningfulExisting || isRefreshableSource(existingSource);

    const contextValue = context?.[field.key] ?? context?.[field.label];
    if (contextValue !== undefined) {
      if (!hasMeaningfulExisting || existingSource !== "user") {
        if (
          ["select", "singleSelect", "radio", "rating"].includes(field.type)
        ) {
          if (isOptionLike(contextValue)) {
            const rawValue = String(contextValue.value ?? "");
            const rawLabel = String(contextValue.label ?? "");
            const matched = (field.options || []).find((opt) => {
              const optLabel = String(opt.label || opt.value || "");
              const optValue = String(opt.value || "");
              return (
                optValue === rawValue ||
                optLabel === rawLabel ||
                optValue === rawLabel ||
                optLabel === rawValue
              );
            });
            assignValue(
              key,
              matched
                ? {
                    value: matched.value,
                    label: matched.label || matched.value,
                  }
                : {
                    value: contextValue.value,
                    label: contextValue.label || contextValue.value,
                  },
              "context",
            );
          } else {
            const rawString =
              contextValue !== null && contextValue !== undefined
                ? String(contextValue)
                : "";
            const leafString = getLeafPath(rawString) || rawString;
            const matched = (field.options || []).find((opt) => {
              const optLabel = String(opt.label || opt.value || "");
              const optValue = String(opt.value || "");
              return (
                optValue === rawString ||
                optLabel === rawString ||
                optLabel === leafString ||
                String(optLabel) === String(rawString)
              );
            });
            assignValue(
              key,
              matched
                ? {
                    value: matched.value,
                    label: matched.label || matched.value,
                  }
                : contextValue,
              "context",
            );
          }
        } else {
          assignValue(key, contextValue, "context");
        }
      }
      return;
    }

    if (!canRefresh) return;

    const isSelectable = ["select", "singleSelect", "radio", "rating"].includes(
      field.type,
    );
    if (field.defaultValue) {
      if (isSelectable) {
        const findOption = (val: string | undefined) =>
          (field.options || []).find((o) => o.label === val || o.value === val);
        let opt = findOption(field.defaultValue as string);
        if (!opt && field.options?.length) opt = field.options[0];
        if (opt)
          assignValue(
            key,
            { value: opt.value, label: opt.label || opt.value },
            "template_default",
          );
      } else {
        let v = field.defaultValue || "";
        if (typeof v === "string") v = renderTemplate(v, dataForParsing);
        assignValue(key, v, "template_default");
      }
    } else if (
      !hasMeaningfulExisting ||
      existingSource === undefined ||
      existingSource === "system_auto"
    ) {
      if (field.type === "date")
        assignValue(key, dayjs().format("YYYY-MM-DD"), "system_auto");
      else if (field.type === "time")
        assignValue(key, dayjs().format("HH:mm"), "system_auto");
      else if (isSelectable && field.options?.length) {
        const first = field.options[0];
        assignValue(
          key,
          { value: first.value, label: first.label || first.value },
          "system_auto",
        );
      }
    }
  });

  if (!changed) return { changed: false, formData: current, fieldSources };

  const finalized = finalizeLinkedTimeFields(
    next,
    { startKey: "时间", endKey: "结束", durationKey: "时长" },
    { durationOutput: "number", direction: timeDirection },
  );
  const autoComputedKeys: string[] = [];
  if (finalized["时间"] !== next["时间"]) autoComputedKeys.push("时间");
  if (finalized["结束"] !== next["结束"]) autoComputedKeys.push("结束");
  if (finalized["时长"] !== next["时长"]) autoComputedKeys.push("时长");
  autoComputedKeys.forEach((key) => {
    next[key] = finalized[key];
    nextSources[key] = "system_auto";
  });

  return { changed: true, formData: next, fieldSources: nextSources };
}
export function deriveQuickInputInitialSelection(
  initialFormData?: QuickInputFormData,
  context?: QuickInputContext,
): QuickInputInitialSelection {
  const goalContext = readRecord(context, "__goalContext");
  return {
    selectedGoalId:
      readFirstString(initialFormData, ["goalId", "目标ID"]) ??
      readFirstString(context, ["goalId", "目标ID"]) ??
      readFirstString(goalContext, ["goalId"]) ??
      null,
    selectedGoalPath: cleanDisplayPath(
      readFirstString(initialFormData, ["goalPath", "目标"]) ??
        readFirstString(context, ["goalPath", "目标"]) ??
        readFirstString(goalContext, ["goalPath"]) ??
        "",
    ),
    selectedTemplateVariantId:
      readFirstString(initialFormData, [
        "templateVariantId",
        "goalTemplateVariantId",
        "goalTemplateId",
        "templateId",
      ]) ??
      readFirstString(context, [
        "templateVariantId",
        "goalTemplateVariantId",
        "goalTemplateId",
        "templateId",
      ]) ??
      readFirstString(goalContext, [
        "templateVariantId",
        "goalTemplateId",
        "templateId",
      ]) ??
      null,
    timeDirection:
      initialFormData?.__timeDirection === "backward" ? "backward" : "forward",
  };
}

export function resolveQuickInputThemeSelectionOnClick(params: {
  selectedThemeId: string | null;
  themeId: string | null;
  path: string | null;
  pathToIdMap: Map<string, string>;
}) {
  const { selectedThemeId, themeId, path, pathToIdMap } = params;
  if (!themeId || !path) return null;
  if (selectedThemeId !== themeId) return themeId;
  const parentPath = path.includes("/")
    ? path.slice(0, path.lastIndexOf("/"))
    : "";
  return parentPath ? (pathToIdMap.get(parentPath) ?? null) : null;
}
export interface BuildQuickInputEditorStateInput {
  blockId: string;
  effectiveBlockId?: string | null;
  selectedGoal?: GoalDefinition | null;
  selectedGoalId?: string | null;
  currentGoalPath?: string | null;
  currentGoalTitle?: string | null;
  currentGoalParts: { root?: string | null; leaf?: string | null };
  currentPeriod?: QuickInputPeriodLike | null;
  selectedThemeId: string | null;
  themeIdMap: Map<string, ThemeDefinition>;
  theme?: ThemeDefinition | null;
  formData: QuickInputFormData;
  currentPeriodFields: QuickInputFormData;
  timeDirection: TimeDirection;
  template: QuickInputTemplateLike | null;
  templateId: string | null;
  resolvedTemplateVariantId?: string | null;
  selectedTemplateVariantId?: string | null;
  templateSourceType: "core-block" | "goal-template" | null;
  fieldSources: QuickInputFieldSourceMap;
}

export function buildQuickInputEditorState(
  input: BuildQuickInputEditorStateInput,
): QuickInputEditorState {
  const currentTheme = input.selectedThemeId
    ? (input.themeIdMap.get(input.selectedThemeId) ?? input.theme ?? null)
    : (input.theme ?? null);
  const effectiveThemePath = String(
    input.formData.themePath ??
      input.formData["主题"] ??
      currentTheme?.path ??
      input.selectedGoal?.themePath ??
      "",
  ).trim();
  const themeParts = splitThemePathParts(effectiveThemePath || null);
  const templateVariantId =
    input.resolvedTemplateVariantId || input.selectedTemplateVariantId || null;
  return {
    blockId: input.blockId,
    coreBlockId: input.effectiveBlockId,
    goalId: input.selectedGoal?.id || input.selectedGoalId,
    goalPath: input.currentGoalPath,
    goalTitle: input.currentGoalTitle,
    rootGoal: input.currentGoalParts.root,
    leafGoal: input.currentGoalParts.leaf,
    cycleId: input.currentPeriod?.id || null,
    themeId: input.selectedThemeId,
    formData: {
      ...input.formData,
      templateId: input.templateId || undefined,
      goalTemplateId: input.templateId || undefined,
      templateVariantId: templateVariantId || undefined,
      goalTemplateVariantId: templateVariantId || undefined,
      ...input.currentPeriodFields,
      __timeDirection: input.timeDirection,
    },
    meta: { timeDirection: input.timeDirection },
    template: input.template,
    theme: currentTheme,
    templateId: input.templateId,
    templateVariantId,
    templateSourceType: input.templateSourceType,
    fieldSources: input.fieldSources,
    ...themeParts,
    fieldSourceSummary: buildFieldSourceSummary(input.fieldSources),
  };
}

export function buildQuickInputDisplayTemplate(
  rawTemplate: QuickInputTemplateLike | null | undefined,
  effectiveBlockId: string | null | undefined,
  availableThemes: ThemeDefinition[],
  goalFieldOptions: Array<{ value: string; label: string }>,
) {
  if (!rawTemplate?.fields?.length) return rawTemplate;
  const themeFieldOptions = themeOptions(availableThemes);
  return {
    ...rawTemplate,
    coreBlockId: effectiveBlockId || rawTemplate.coreBlockId,
    fields: rawTemplate.fields.map((field: TemplateField) => {
      const semantic = getTemplateFieldSemantic(field);
      if (semantic === "goals") return { ...field, options: goalFieldOptions };
      if (semantic === "themePath")
        return {
          ...field,
          type: field.type === "path" ? "hierarchicalSingleSelect" : field.type,
          options: themeFieldOptions,
        };
      return field;
    }),
  };
}

export function shouldShowQuickInputTimeDirectionControl(
  template: QuickInputTemplateLike | null | undefined,
): boolean {
  if (!template?.fields) return false;
  const keys = new Set(
    (template.fields || []).map(
      (field: TemplateField) => field.key || field.label,
    ),
  );
  return keys.has("时间") && keys.has("结束") && keys.has("时长");
}

export function buildQuickInputPeriodUi(
  currentPeriod: QuickInputPeriodLike | null,
) {
  return {
    fields: currentPeriod
      ? {
          cycleId: currentPeriod.id,
          periodId: currentPeriod.id,
          periodLabel: currentPeriod.label,
          周期ID: currentPeriod.id,
          周期: currentPeriod.label,
          周期粒度: currentPeriod.granularity,
        }
      : {},
    options: currentPeriod
      ? {
          cycleId: [{ value: currentPeriod.id, label: currentPeriod.label }],
          周期ID: [{ value: currentPeriod.id, label: currentPeriod.label }],
          周期: [{ value: currentPeriod.label, label: currentPeriod.label }],
        }
      : {},
  };
}
