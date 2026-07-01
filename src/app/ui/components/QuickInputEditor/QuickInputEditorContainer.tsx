/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useReducer, useRef } from 'preact/hooks';

import { selectSettings, useSelector } from '@/app/public';
import { GoalTemplateResolver } from '@core/recordInput/public';
import { dayjs } from '@core/utils/public';
import { getEffectiveCoreBlocks } from '@core/blocks/public';
import { getGoalTemplateVariants, resolveDerivedPeriod, resolveTemplatePeriodPolicy } from '@core/goal/public';
import { initializeRecordInputSession, reduceRecordInputSession } from '@core/recordInput/public';
import type { ThemeDefinition } from '@core/types/public';
import { QuickInputEditorView } from './QuickInputEditorView';
import type { GoalSelectorOption } from './components/GoalSelector';
import {
  EMPTY_FORM_DATA,
  applyQuickInputFieldUpdate,
  applyQuickInputTimeDirectionChange,
  applyQuickInputGoalSelection,
  buildQuickInputEditorState,
  buildInitialFieldSources,
  buildQuickInputDisplayTemplate,
  buildQuickInputGoalOptions,
  buildQuickInputPeriodUi,
  cleanDisplayPath,
  cleanDisplaySegment,
  deriveQuickInputInitialSelection,
  getGoalPath,
  hydrateQuickInputTemplateDefaults,
  resolveQuickInputThemeSelectionOnClick,
  resolveQuickInputCoreBlockId,
  shouldShowQuickInputTimeDirectionControl,
  splitPathParts,
  themeOptions,
} from './QuickInputEditorModel';
import type { QuickInputEditorProps, QuickInputFieldSourceMap, QuickInputFormData, TimeDirection } from './QuickInputEditorModel';
export { finalizeQuickInputFormData } from './QuickInputEditorModel';
export type { QuickInputEditorProps, QuickInputEditorState } from './QuickInputEditorModel';

export function QuickInputEditor({
  getResourcePath,
  initialBlockId,
  context,
  initialThemeId = null,
  initialFormData,
  recordInputMode = 'create',
  allowBlockSwitch = true,
  dense = false,
  showDivider = true,
  onStateChange,
  onRequestSubmit,
  isMobileLike = false,
}: QuickInputEditorProps) {
  const fullSettings = useSelector(selectSettings);
  const settings = fullSettings.inputSettings;
  const initialFieldSource = recordInputMode === 'create' ? 'context' : 'edit_backfill';
  const recordInputModeRef = useRef(recordInputMode);
  const [session, dispatchSession] = useReducer(
    reduceRecordInputSession,
    initializeRecordInputSession({
      mode: recordInputMode,
      initialBlockId,
      initialThemeId,
      initialFormData: initialFormData ?? EMPTY_FORM_DATA,
      initialFieldSources: buildInitialFieldSources(initialFormData, initialFieldSource),
      initialSelection: deriveQuickInputInitialSelection(initialFormData, context),
    }),
  );

  const {
    currentBlockId,
    selectedThemeId,
    selectedGoalId,
    selectedGoalPath,
    selectedTemplateVariantId,
    formData,
    fieldSources,
    timeDirection,
  } = session;

  // 不要依赖 initialFormData（可能是新对象）→ 用 block/theme/context 变化作为 reset 语义。
  useEffect(() => {
    const modeForReset = recordInputModeRef.current;
    const sourceForReset = modeForReset === 'create' ? 'context' : 'edit_backfill';
    dispatchSession({
      type: 'reset',
      payload: {
        mode: modeForReset,
        initialBlockId,
        initialThemeId,
        initialFormData: initialFormData ?? EMPTY_FORM_DATA,
        initialFieldSources: buildInitialFieldSources(initialFormData, sourceForReset),
        initialSelection: deriveQuickInputInitialSelection(initialFormData, context),
      },
    });
  }, [initialBlockId, initialThemeId, context]);

  useEffect(() => {
    recordInputModeRef.current = recordInputMode;
    dispatchSession({ type: 'setMode', mode: recordInputMode });
  }, [recordInputMode]);

  const blocks = useMemo(() => {
    const coreBlocks = getEffectiveCoreBlocks(fullSettings);
    return coreBlocks.length ? coreBlocks : (settings.blocks || []);
  }, [fullSettings, settings.blocks]);
  const themes = useMemo(() => settings.themes || [], [settings.themes]);

  const { availableThemes, themeIdMap, pathToIdMap } = useMemo(() => {
    // Theme 已降级为目标 / 预设的上下文字段，不再通过 Theme × Block override 禁用主题。
    return {
      availableThemes: themes || [],
      themeIdMap: new Map<string, ThemeDefinition>((themes || []).map((t: any) => [t.id, t])),
      pathToIdMap: new Map<string, string>((themes || []).map((t: any) => [t.path, t.id])),
    };
  }, [themes]);

  const selectedGoal = useMemo(() => {
    const goals = fullSettings.goalSettings?.goals || [];
    return (selectedGoalId ? goals.find((goal) => goal.id === selectedGoalId) : null)
      || (selectedGoalPath ? goals.find((goal) => getGoalPath(goal) === selectedGoalPath) : null)
      || null;
  }, [fullSettings.goalSettings?.goals, selectedGoalId, selectedGoalPath]);

  const currentEffectiveBlockIdForTemplates = useMemo(
    () => resolveQuickInputCoreBlockId(fullSettings, currentBlockId),
    [fullSettings.coreBlockSettings, fullSettings.inputSettings?.blocks, currentBlockId]
  );

  const goalTemplateVariants = useMemo(() => {
    const goal = selectedGoal || null;
    if (!goal || !currentEffectiveBlockIdForTemplates) return [];
    return getGoalTemplateVariants(fullSettings.goalSettings, goal, currentEffectiveBlockIdForTemplates);
  }, [fullSettings.goalSettings, selectedGoal, currentEffectiveBlockIdForTemplates]);

  useEffect(() => {
    if (!goalTemplateVariants.length) {
      if (selectedTemplateVariantId) dispatchSession({ type: 'selectTemplateVariant', variantId: null });
      return;
    }
    const exists = selectedTemplateVariantId && goalTemplateVariants.some((template) => template.variantId === selectedTemplateVariantId || template.id === selectedTemplateVariantId);
    if (!exists) {
      const next = goalTemplateVariants[0];
      dispatchSession({ type: 'selectTemplateVariant', variantId: next?.variantId || 'default' });
    }
  }, [goalTemplateVariants, selectedTemplateVariantId]);

  const { template: rawTemplate, theme, goal: resolvedGoal, templateId, templateSourceType, effectiveBlockId, templateVariantId: resolvedTemplateVariantId } = useMemo(() => GoalTemplateResolver.resolve({
    settings: fullSettings,
    blockId: currentBlockId,
    goalId: selectedGoal?.id || selectedGoalId,
    goalPath: selectedGoalPath,
    themeId: selectedThemeId || undefined,
    templateVariantId: selectedTemplateVariantId || undefined,
  }), [
    fullSettings,
    currentBlockId,
    selectedGoal?.id,
    selectedGoalId,
    selectedGoalPath,
    selectedThemeId,
    selectedTemplateVariantId,
  ]);

  const goalOptions = useMemo<GoalSelectorOption[]>(
    () => buildQuickInputGoalOptions(fullSettings, currentEffectiveBlockIdForTemplates),
    [fullSettings, currentEffectiveBlockIdForTemplates]
  );

  const goalFieldOptions = useMemo(() => goalOptions.map((goal) => ({ value: goal.value, label: goal.label })), [goalOptions]);

  useEffect(() => {
    const selectedPath = cleanDisplayPath(selectedGoal?.goalPath || selectedGoalPath || null);
    if (!selectedPath) return;
    const stillVisible = goalOptions.some((option) => cleanDisplayPath(option.value) === selectedPath);
    if (stillVisible) return;
    dispatchSession({ type: 'clearGoalContext' });
  }, [goalOptions, selectedGoal?.goalPath, selectedGoalPath]);

  const currentGoalPath = selectedGoalPath || getGoalPath(selectedGoal || resolvedGoal) || null;
  const currentGoalTitle = cleanDisplaySegment(selectedGoal?.title || resolvedGoal?.title || '') || (currentGoalPath ? currentGoalPath.split('/').filter(Boolean).pop() || currentGoalPath : null);
  const currentGoalParts = splitPathParts(currentGoalPath);
  const currentRecordDate = String(formData['日期'] ?? formData.date ?? dayjs().format('YYYY-MM-DD')).trim();
  const periodPolicy = resolveTemplatePeriodPolicy(rawTemplate as any);
  const currentPeriod = periodPolicy ? resolveDerivedPeriod(currentRecordDate || dayjs().format('YYYY-MM-DD'), periodPolicy.granularity) : null;
  const currentPeriodUi = useMemo(() => buildQuickInputPeriodUi(currentPeriod), [currentPeriod?.id, currentPeriod?.label, currentPeriod?.granularity]);
  const currentPeriodFields = currentPeriodUi.fields;
  const currentPeriodOptions = currentPeriodUi.options;

  const template = useMemo(
    () => buildQuickInputDisplayTemplate(rawTemplate, effectiveBlockId, availableThemes, goalFieldOptions),
    [rawTemplate, availableThemes, effectiveBlockId, goalFieldOptions]
  );

  const showTimeDirectionControl = useMemo(() => shouldShowQuickInputTimeDirectionControl(template), [template]);

  useEffect(() => {
    if (!template) return;
    const hydrated = hydrateQuickInputTemplateDefaults({
      template,
      context,
      current: formData,
      fieldSources,
      selectedGoal,
      selectedGoalId,
      currentGoalPath,
      currentGoalTitle,
      theme,
      currentPeriod,
      timeDirection,
    });
    if (!hydrated.changed) return;
    dispatchSession({
      type: 'hydrateDefaults',
      formData: hydrated.formData,
      fieldSources: hydrated.fieldSources,
    });
  }, [template, theme, context, timeDirection, selectedGoal?.id, selectedGoal?.themePath, selectedGoalId, currentPeriod?.id, currentPeriod?.label, currentGoalPath, currentGoalTitle, formData, fieldSources]);

  useEffect(() => {
    const presetThemePath = String(formData.themePath ?? formData['主题'] ?? '').trim();
    if (!presetThemePath) return;
    const nextThemeId = pathToIdMap.get(presetThemePath) ?? null;
    if (nextThemeId && nextThemeId !== selectedThemeId) dispatchSession({ type: 'selectTheme', themeId: nextThemeId });
  }, [formData.themePath, formData['主题'], pathToIdMap, selectedThemeId]);

  const makeEditorState = (draftFormData: QuickInputFormData, directionOverride: TimeDirection = timeDirection, sourceOverride: QuickInputFieldSourceMap = fieldSources) => buildQuickInputEditorState({
    blockId: currentBlockId,
    effectiveBlockId,
    selectedGoal,
    selectedGoalId,
    currentGoalPath,
    currentGoalTitle,
    currentGoalParts,
    currentPeriod,
    selectedThemeId,
    themeIdMap,
    theme,
    formData: draftFormData,
    currentPeriodFields,
    timeDirection: directionOverride,
    template,
    templateId,
    resolvedTemplateVariantId,
    selectedTemplateVariantId,
    templateSourceType,
    fieldSources: sourceOverride,
  });

  useEffect(() => {
    onStateChange?.(makeEditorState(formData, timeDirection, fieldSources));
  }, [currentBlockId, effectiveBlockId, selectedGoal?.id, selectedGoalId, currentGoalPath, currentGoalTitle, currentGoalParts.root, currentGoalParts.leaf, selectedThemeId, formData, timeDirection, template, templateId, templateSourceType, resolvedTemplateVariantId, selectedTemplateVariantId, fieldSources, theme]);

  const handleUpdateField = (key: string, value: any, isOptionObject = false) => {
    const updated = applyQuickInputFieldUpdate({ formData, fieldSources, key, value, isOptionObject, timeDirection });
    dispatchSession({
      type: 'updateDraft',
      formData: updated.formData,
      fieldSources: updated.fieldSources,
      selectedThemeId: updated.nextThemePath !== undefined
        ? (updated.nextThemePath ? pathToIdMap.get(updated.nextThemePath) ?? null : null)
        : undefined,
      selectedGoalPath: updated.nextGoalPath !== undefined ? updated.nextGoalPath : undefined,
      selectedGoalId: updated.nextGoalPath !== undefined ? updated.nextGoalId ?? null : undefined,
      selectedTemplateVariantId: updated.nextGoalPath !== undefined ? null : undefined,
    });
  };

  const handleTimeDirectionChange = (nextDirection: TimeDirection) => {
    const updated = applyQuickInputTimeDirectionChange({ formData, fieldSources, nextDirection });
    dispatchSession({
      type: 'changeTimeDirection',
      timeDirection: updated.timeDirection,
      formData: updated.formData,
      fieldSources: updated.fieldSources,
    });
  };

  const handleBlockChange = (newBlockId: string) => {
    if (newBlockId === currentBlockId || newBlockId === currentEffectiveBlockIdForTemplates) return;
    dispatchSession({ type: 'switchRecordType', blockId: newBlockId });
  };

  const handleSelectTheme = (themeId: string | null, path: string | null) => {
    dispatchSession({
      type: 'selectTheme',
      themeId: resolveQuickInputThemeSelectionOnClick({ selectedThemeId, themeId, path, pathToIdMap }),
    });
  };

  const handleSelectGoal = (option: GoalSelectorOption | null) => {
    if (!option || !option.value) {
      dispatchSession({ type: 'selectGoal', goalId: null, goalPath: null });
      return;
    }
    const nextSelection = applyQuickInputGoalSelection({ formData, fieldSources, option });
    dispatchSession({
      type: 'selectGoal',
      goalId: nextSelection.goalId,
      goalPath: nextSelection.goalPath,
      selectedThemeId: nextSelection.themePath ? pathToIdMap.get(nextSelection.themePath) ?? null : undefined,
      formData: nextSelection.formData,
      fieldSources: nextSelection.fieldSources,
    });
  };

  return (
    <QuickInputEditorView
      getResourcePath={getResourcePath}
      blocks={blocks}
      allowBlockSwitch={allowBlockSwitch}
      currentBlockId={currentEffectiveBlockIdForTemplates || currentBlockId}
      onBlockChange={handleBlockChange}
      themes={availableThemes}
      selectedThemeId={selectedThemeId}
      onSelectTheme={handleSelectTheme}
      goals={goalOptions}
      selectedGoalPath={currentGoalPath}
      onSelectGoal={handleSelectGoal}
      onCreateGoal={undefined}
      templateVariants={goalTemplateVariants.map((template) => ({ value: template.variantId || 'default', label: template.name || template.variantId || '默认模板' }))}
      selectedTemplateVariantId={resolvedTemplateVariantId || selectedTemplateVariantId}
      onSelectTemplateVariant={(variantId) => dispatchSession({ type: 'selectTemplateVariant', variantId })}
      template={template}
      formData={formData}
      fieldValueOptionsByKey={{ themePath: themeOptions(availableThemes), '主题': themeOptions(availableThemes), ...currentPeriodOptions }}
      timeDirection={timeDirection}
      dense={dense}
      showDivider={showDivider}
      onUpdateField={handleUpdateField}
      onTimeDirectionChange={handleTimeDirectionChange}
      onRequestSubmit={onRequestSubmit}
      isMobileLike={isMobileLike}
      showTimeDirectionControl={showTimeDirectionControl}
      currentThemePath={String(formData.themePath ?? formData['主题'] ?? theme?.path ?? selectedGoal?.themePath ?? '') || null}
      currentPeriodLabel={currentPeriod?.label || null}
      templateSourceType={templateSourceType}
      fieldSourceSummary={makeEditorState(formData, timeDirection, fieldSources).fieldSourceSummary}
    />
  );
}
