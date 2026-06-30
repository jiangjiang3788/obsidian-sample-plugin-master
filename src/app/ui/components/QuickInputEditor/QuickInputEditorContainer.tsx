/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';

import { selectSettings, useSelector } from '@/app/public';
import { GoalTemplateResolver, dayjs, getEffectiveCoreBlocks, getGoalTemplateVariants, resolveDerivedPeriod, resolveTemplatePeriodPolicy } from '@core/public';
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
  clearQuickInputGoalContext,
  deriveQuickInputInitialSelection,
  getGoalPath,
  hydrateQuickInputTemplateDefaults,
  preserveQuickInputBlockSwitchState,
  resolveQuickInputThemeSelectionOnClick,
  resolveQuickInputCoreBlockId,
  shouldShowQuickInputTimeDirectionControl,
  splitPathParts,
  themeOptions,
} from './QuickInputEditorModel';
import type { QuickInputEditorProps, QuickInputFieldSourceMap, TimeDirection } from './QuickInputEditorModel';
export { finalizeQuickInputFormData } from './QuickInputEditorModel';
export type { QuickInputEditorProps, QuickInputEditorState } from './QuickInputEditorModel';

/**
 * QuickInputEditor（Container）
 * - 状态/订阅/副作用在这里
 * - 纯渲染交给 QuickInputEditorView
 */
export function QuickInputEditor({
  getResourcePath,
  initialBlockId,
  context,
  initialThemeId = null,
  initialFormData,
  allowBlockSwitch = true,
  dense = false,
  showDivider = true,
  onStateChange,
  onRequestSubmit,
  isMobileLike = false,
}: QuickInputEditorProps) {
  const fullSettings = useSelector(selectSettings);
  const settings = fullSettings.inputSettings;
  const [currentBlockId, setCurrentBlockId] = useState(initialBlockId);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(initialThemeId);
  const initialSelection = deriveQuickInputInitialSelection(initialFormData, context);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(() => initialSelection.selectedGoalId);
  const [selectedGoalPath, setSelectedGoalPath] = useState<string | null>(() => initialSelection.selectedGoalPath);
  const [selectedTemplateVariantId, setSelectedTemplateVariantId] = useState<string | null>(() => initialSelection.selectedTemplateVariantId);
  const [formData, setFormData] = useState<Record<string, any>>(() => initialFormData ?? EMPTY_FORM_DATA);
  const [fieldSources, setFieldSources] = useState<QuickInputFieldSourceMap>(() => buildInitialFieldSources(initialFormData));
  const [timeDirection, setTimeDirection] = useState<TimeDirection>(() => initialSelection.timeDirection);

  useEffect(() => setCurrentBlockId(initialBlockId), [initialBlockId]);
  useEffect(() => setSelectedThemeId(initialThemeId ?? null), [initialThemeId]);
  // 不要依赖 initialFormData（可能是新对象）→ 用 block/theme 变化作为 reset 语义。
  useEffect(() => {
    const nextSelection = deriveQuickInputInitialSelection(initialFormData, context);
    setFormData(initialFormData ?? EMPTY_FORM_DATA);
    setFieldSources(buildInitialFieldSources(initialFormData));
    setTimeDirection(nextSelection.timeDirection);
    setSelectedGoalId(nextSelection.selectedGoalId);
    setSelectedGoalPath(nextSelection.selectedGoalPath);
    setSelectedTemplateVariantId(nextSelection.selectedTemplateVariantId);
  }, [initialBlockId, initialThemeId, context]);

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
      if (selectedTemplateVariantId) setSelectedTemplateVariantId(null);
      return;
    }
    const exists = selectedTemplateVariantId && goalTemplateVariants.some((template) => template.variantId === selectedTemplateVariantId || template.id === selectedTemplateVariantId);
    if (!exists) {
      const next = goalTemplateVariants[0];
      setSelectedTemplateVariantId(next?.variantId || 'default');
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
    setSelectedGoalId(null);
    setSelectedGoalPath(null);
    setSelectedTemplateVariantId(null);
    setFormData((current) => clearQuickInputGoalContext(current, fieldSources).formData);
    setFieldSources((current) => clearQuickInputGoalContext(formData, current).fieldSources);
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

  // 默认值/从 context 回填
  useEffect(() => {
    if (!template) return;

    setFormData((current) => {
      const hydrated = hydrateQuickInputTemplateDefaults({
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
      });
      if (!hydrated.changed) return current;
      setFieldSources(hydrated.fieldSources);
      return hydrated.formData;
    });
  }, [template, theme, context, timeDirection, selectedGoal?.id, selectedGoal?.themePath, selectedGoalId, currentPeriod?.id, currentPeriod?.label, currentGoalPath, currentGoalTitle]);

  useEffect(() => {
    const presetThemePath = String(formData.themePath ?? formData['主题'] ?? '').trim();
    if (!presetThemePath) return;
    const nextThemeId = pathToIdMap.get(presetThemePath) ?? null;
    if (nextThemeId && nextThemeId !== selectedThemeId) setSelectedThemeId(nextThemeId);
  }, [formData.themePath, formData['主题'], pathToIdMap, selectedThemeId]);

  const makeEditorState = (draftFormData: Record<string, any>, directionOverride: TimeDirection = timeDirection, sourceOverride: QuickInputFieldSourceMap = fieldSources) => buildQuickInputEditorState({
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

  const emitDraftState = (draftFormData: Record<string, any>, directionOverride: TimeDirection = timeDirection, sourceOverride: QuickInputFieldSourceMap = fieldSources) => {
    onStateChange?.(makeEditorState(draftFormData, directionOverride, sourceOverride));
  };

  const handleUpdateField = (key: string, value: any, isOptionObject = false) => {
    const updated = applyQuickInputFieldUpdate({ formData, fieldSources, key, value, isOptionObject, timeDirection });
    if (updated.nextThemePath !== undefined) setSelectedThemeId(updated.nextThemePath ? pathToIdMap.get(updated.nextThemePath) ?? null : null);
    if (updated.nextGoalPath !== undefined) {
      setSelectedGoalPath(updated.nextGoalPath);
      setSelectedGoalId(updated.nextGoalId ?? null);
    }
    setFormData(updated.formData);
    setFieldSources(updated.fieldSources);
    emitDraftState(updated.formData, timeDirection, updated.fieldSources);
  };

  const handleTimeDirectionChange = (nextDirection: TimeDirection) => {
    const updated = applyQuickInputTimeDirectionChange({ formData, fieldSources, nextDirection });
    setTimeDirection(updated.timeDirection);
    setFormData(updated.formData);
    setFieldSources(updated.fieldSources);
    emitDraftState(updated.formData, updated.timeDirection, updated.fieldSources);
  };

  const handleBlockChange = (newBlockId: string) => {
    if (newBlockId === currentBlockId) return;
    const preserved = preserveQuickInputBlockSwitchState(formData, fieldSources);
    setSelectedTemplateVariantId(null);
    setCurrentBlockId(newBlockId);
    setFormData(preserved.formData);
    setFieldSources(preserved.fieldSources);
    setTimeDirection('forward');
  };

  const handleSelectTheme = (themeId: string | null, path: string | null) => {
    setSelectedThemeId(resolveQuickInputThemeSelectionOnClick({ selectedThemeId, themeId, path, pathToIdMap }));
  };

  const handleSelectGoal = (option: GoalSelectorOption | null) => {
    if (!option || !option.value) {
      setSelectedGoalId(null);
      setSelectedGoalPath(null);
      setSelectedTemplateVariantId(null);
      return;
    }
    const nextSelection = applyQuickInputGoalSelection({ formData, fieldSources, option });
    setSelectedGoalId(nextSelection.goalId);
    setSelectedGoalPath(nextSelection.goalPath);
    setSelectedTemplateVariantId(null);
    if (nextSelection.themePath) setSelectedThemeId(pathToIdMap.get(nextSelection.themePath) ?? null);
    setFormData(nextSelection.formData);
    setFieldSources(nextSelection.fieldSources);
  };

  return (
    <QuickInputEditorView
      getResourcePath={getResourcePath}
      blocks={blocks}
      allowBlockSwitch={allowBlockSwitch}
      currentBlockId={currentBlockId}
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
      onSelectTemplateVariant={setSelectedTemplateVariantId}
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
