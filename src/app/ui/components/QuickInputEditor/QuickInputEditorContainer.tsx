/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';

import { selectSettings, useSelector, useUseCases } from '@/app/public';
import { GoalTemplateResolver, dayjs, getEffectiveCoreBlocks, getGoalTemplateVariants, resolveDerivedPeriod, resolveTemplatePeriodPolicy, getTemplateFieldSemantic, splitGoalPath } from '@core/public';
import { QuickInputEditorView } from './QuickInputEditorView';
import type { GoalSelectorOption } from './components/GoalSelector';
import {
  EMPTY_FORM_DATA,
  applyQuickInputLinkedTimeChanges,
  buildFieldSourceSummary,
  buildInitialFieldSources,
  buildQuickInputGoalOptions,
  cleanDisplayPath,
  cleanDisplaySegment,
  getGoalPath,
  hydrateQuickInputTemplateDefaults,
  isMeaningfulValue,
  makeGoalIdFromPath,
  resolveQuickInputCoreBlockId,
  splitPathParts,
  splitThemePathParts,
  themeOptions,
} from './QuickInputEditorModel';
import type { QuickInputEditorProps, QuickInputFieldSource, QuickInputFieldSourceMap, TimeDirection } from './QuickInputEditorModel';
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
  const useCases = useUseCases();

  const [currentBlockId, setCurrentBlockId] = useState(initialBlockId);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(initialThemeId);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(() => String(initialFormData?.goalId ?? initialFormData?.['目标ID'] ?? context?.goalId ?? context?.['目标ID'] ?? context?.__goalContext?.goalId ?? '').trim() || null);
  const [selectedGoalPath, setSelectedGoalPath] = useState<string | null>(() => cleanDisplayPath(String(initialFormData?.goalPath ?? initialFormData?.['目标'] ?? context?.goalPath ?? context?.['目标'] ?? context?.__goalContext?.goalPath ?? '')));
  const [selectedTemplateVariantId, setSelectedTemplateVariantId] = useState<string | null>(() => String(initialFormData?.templateVariantId ?? initialFormData?.goalTemplateVariantId ?? initialFormData?.goalTemplateId ?? initialFormData?.templateId ?? context?.templateVariantId ?? context?.goalTemplateVariantId ?? context?.goalTemplateId ?? context?.templateId ?? context?.__goalContext?.templateVariantId ?? context?.__goalContext?.goalTemplateId ?? context?.__goalContext?.templateId ?? '').trim() || null);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(() => String(initialFormData?.cycleId ?? initialFormData?.['周期ID'] ?? context?.cycleId ?? context?.['周期ID'] ?? context?.__goalContext?.cycleId ?? '').trim() || null);
  const [formData, setFormData] = useState<Record<string, any>>(() => initialFormData ?? EMPTY_FORM_DATA);
  const [fieldSources, setFieldSources] = useState<QuickInputFieldSourceMap>(() => buildInitialFieldSources(initialFormData));
  const [timeDirection, setTimeDirection] = useState<TimeDirection>(() => (initialFormData?.__timeDirection === 'backward' ? 'backward' : 'forward'));

  useEffect(() => setCurrentBlockId(initialBlockId), [initialBlockId]);
  useEffect(() => setSelectedThemeId(initialThemeId ?? null), [initialThemeId]);
  // 不要依赖 initialFormData（可能是新对象）→ 用 block/theme 变化作为 reset 语义。
  useEffect(() => {
    setFormData(initialFormData ?? EMPTY_FORM_DATA);
    setFieldSources(buildInitialFieldSources(initialFormData));
    setTimeDirection(initialFormData?.__timeDirection === 'backward' ? 'backward' : 'forward');
    setSelectedGoalId(String(initialFormData?.goalId ?? initialFormData?.['目标ID'] ?? context?.goalId ?? context?.['目标ID'] ?? context?.__goalContext?.goalId ?? '').trim() || null);
    setSelectedGoalPath(cleanDisplayPath(String(initialFormData?.goalPath ?? initialFormData?.['目标'] ?? context?.goalPath ?? context?.['目标'] ?? context?.__goalContext?.goalPath ?? '')));
    setSelectedTemplateVariantId(String(initialFormData?.templateVariantId ?? initialFormData?.goalTemplateVariantId ?? initialFormData?.goalTemplateId ?? initialFormData?.templateId ?? context?.templateVariantId ?? context?.goalTemplateVariantId ?? context?.goalTemplateId ?? context?.templateId ?? context?.__goalContext?.templateVariantId ?? context?.__goalContext?.goalTemplateId ?? context?.__goalContext?.templateId ?? '').trim() || null);
    setSelectedCycleId(String(initialFormData?.cycleId ?? initialFormData?.['周期ID'] ?? context?.cycleId ?? context?.['周期ID'] ?? context?.__goalContext?.cycleId ?? '').trim() || null);
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
      const next = goalTemplateVariants.find((template) => template.isDefault) || goalTemplateVariants[0];
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
    setSelectedCycleId(null);
    setFormData((current) => {
      const next = { ...current };
      ['goalId', '目标ID', 'goalPath', '目标', 'rootGoal', 'leafGoal', 'cycleId', '周期ID', '周期', '周期粒度', 'templateId', 'goalTemplateId', 'templateVariantId', 'goalTemplateVariantId'].forEach((key) => delete next[key]);
      return next;
    });
    setFieldSources((current) => {
      const next = { ...current };
      ['goalId', '目标ID', 'goalPath', '目标', 'rootGoal', 'leafGoal', 'cycleId', '周期ID', '周期', '周期粒度', 'templateId', 'goalTemplateId', 'templateVariantId', 'goalTemplateVariantId'].forEach((key) => delete next[key]);
      return next;
    });
  }, [goalOptions, selectedGoal?.goalPath, selectedGoalPath]);

  const currentGoalPath = selectedGoalPath || getGoalPath(selectedGoal || resolvedGoal) || null;
  const currentGoalTitle = cleanDisplaySegment(selectedGoal?.title || resolvedGoal?.title || '') || (currentGoalPath ? currentGoalPath.split('/').filter(Boolean).pop() || currentGoalPath : null);
  const currentGoalParts = splitPathParts(currentGoalPath);
  const currentRecordDate = String(formData['日期'] ?? formData.date ?? dayjs().format('YYYY-MM-DD')).trim();
  const periodPolicy = resolveTemplatePeriodPolicy(rawTemplate as any);
  const currentPeriod = periodPolicy ? resolveDerivedPeriod(currentRecordDate || dayjs().format('YYYY-MM-DD'), periodPolicy.granularity) : null;
  const currentPeriodFields = currentPeriod ? { cycleId: currentPeriod.id, periodId: currentPeriod.id, periodLabel: currentPeriod.label, '周期ID': currentPeriod.id, '周期': currentPeriod.label, '周期粒度': currentPeriod.granularity } : {};
  const currentPeriodOptions = currentPeriod ? { cycleId: [{ value: currentPeriod.id, label: currentPeriod.label }], '周期ID': [{ value: currentPeriod.id, label: currentPeriod.label }], '周期': [{ value: currentPeriod.label, label: currentPeriod.label }] } : {};

  const template = useMemo(() => {
    if (!rawTemplate?.fields?.length) return rawTemplate;
    const themeFieldOptions = themeOptions(availableThemes);
    return {
      ...rawTemplate,
      coreBlockId: effectiveBlockId || rawTemplate.coreBlockId,
      fields: rawTemplate.fields.map((field: any) => {
        const semantic = getTemplateFieldSemantic(field);
        if (semantic === 'goals') return { ...field, options: goalFieldOptions };
        if (semantic === 'themePath') return { ...field, type: field.type === 'path' ? 'hierarchicalSingleSelect' : field.type, options: themeFieldOptions };
        return field;
      }),
    };
  }, [rawTemplate, availableThemes, effectiveBlockId, goalFieldOptions]);

  const showTimeDirectionControl = useMemo(() => {
    if (!template?.fields) return false;
    const keys = new Set((template.fields || []).map((f: any) => f.key || f.label));
    return keys.has('时间') && keys.has('结束') && keys.has('时长');
  }, [template]);

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

  useEffect(() => {
    const currentTheme = selectedThemeId ? themeIdMap.get(selectedThemeId) ?? theme ?? null : theme ?? null;
    const effectiveThemePath = String(formData.themePath ?? formData['主题'] ?? currentTheme?.path ?? selectedGoal?.themePath ?? '').trim();
    const themeParts = splitThemePathParts(effectiveThemePath || null);
    onStateChange?.({
      blockId: currentBlockId,
      coreBlockId: effectiveBlockId,
      goalId: selectedGoal?.id || selectedGoalId,
      goalPath: currentGoalPath,
      goalTitle: currentGoalTitle,
      rootGoal: currentGoalParts.root,
      leafGoal: currentGoalParts.leaf,
      cycleId: currentPeriod?.id || null,
      themeId: selectedThemeId,
      formData: { ...formData, templateId: templateId || undefined, goalTemplateId: templateId || undefined, templateVariantId: resolvedTemplateVariantId || selectedTemplateVariantId || undefined, goalTemplateVariantId: resolvedTemplateVariantId || selectedTemplateVariantId || undefined, ...currentPeriodFields, __timeDirection: timeDirection },
      meta: { timeDirection },
      template,
      theme: currentTheme,
      templateId,
      templateVariantId: resolvedTemplateVariantId || selectedTemplateVariantId,
      templateSourceType,
      fieldSources,
      ...themeParts,
      fieldSourceSummary: buildFieldSourceSummary(fieldSources),
    });
  }, [currentBlockId, effectiveBlockId, selectedGoal?.id, selectedGoalId, currentGoalPath, currentGoalTitle, currentGoalParts.root, currentGoalParts.leaf, selectedThemeId, selectedCycleId, formData, timeDirection, template, templateId, templateSourceType, resolvedTemplateVariantId, selectedTemplateVariantId, fieldSources, theme]);

  const emitDraftState = (draftFormData: Record<string, any>, directionOverride: TimeDirection = timeDirection, sourceOverride: QuickInputFieldSourceMap = fieldSources) => {
    const currentTheme = selectedThemeId ? themeIdMap.get(selectedThemeId) ?? theme ?? null : theme ?? null;
    const effectiveThemePath = String(draftFormData.themePath ?? draftFormData['主题'] ?? currentTheme?.path ?? selectedGoal?.themePath ?? '').trim();
    const themeParts = splitThemePathParts(effectiveThemePath || null);
    onStateChange?.({
      blockId: currentBlockId,
      coreBlockId: effectiveBlockId,
      goalId: selectedGoal?.id || selectedGoalId,
      goalPath: currentGoalPath,
      goalTitle: currentGoalTitle,
      rootGoal: currentGoalParts.root,
      leafGoal: currentGoalParts.leaf,
      cycleId: currentPeriod?.id || null,
      themeId: selectedThemeId,
      formData: { ...draftFormData, templateId: templateId || undefined, goalTemplateId: templateId || undefined, templateVariantId: resolvedTemplateVariantId || selectedTemplateVariantId || undefined, goalTemplateVariantId: resolvedTemplateVariantId || selectedTemplateVariantId || undefined, ...currentPeriodFields, __timeDirection: directionOverride },
      meta: { timeDirection: directionOverride },
      template,
      theme: currentTheme,
      templateId,
      templateVariantId: resolvedTemplateVariantId || selectedTemplateVariantId,
      templateSourceType,
      fieldSources: sourceOverride,
      ...themeParts,
      fieldSourceSummary: buildFieldSourceSummary(sourceOverride),
    });
  };

  const handleUpdateField = (key: string, value: any, isOptionObject = false) => {
    const rawValue = isOptionObject ? value?.value : value;
    if (key === 'themePath' || key === '主题') {
      const nextPath = String(rawValue ?? '').trim();
      setSelectedThemeId(nextPath ? pathToIdMap.get(nextPath) ?? null : null);
    }
    if (key === 'goalPath' || key === '目标' || key === '目标路径') {
      const nextGoalPath = cleanDisplayPath(String(rawValue ?? ''));
      setSelectedGoalPath(nextGoalPath);
      setSelectedGoalId(nextGoalPath ? makeGoalIdFromPath(nextGoalPath) : null);
    }
    setFormData((cur) => {
      const draft = { ...cur, [key]: isOptionObject ? { value: value.value, label: value.label } : value, lastChanged: key };
      const linked = applyQuickInputLinkedTimeChanges(draft, timeDirection);
      setFieldSources((prev) => {
        const nextSources = { ...prev, [key]: 'user' as QuickInputFieldSource };
        linked.autoKeys.forEach((autoKey) => {
          if (autoKey !== key) nextSources[autoKey] = 'system_auto';
        });
        emitDraftState(linked.formData, timeDirection, nextSources);
        return nextSources;
      });
      return linked.formData;
    });
  };

  const handleTimeDirectionChange = (nextDirection: TimeDirection) => {
    setTimeDirection(nextDirection);
    setFormData((cur) => {
      const draft = { ...cur };
      if (nextDirection === 'backward' && !draft['结束']) {
        draft['结束'] = dayjs().format('HH:mm');
      }
      const linked = applyQuickInputLinkedTimeChanges(draft, nextDirection);
      setFieldSources((prev) => {
        const nextSources = { ...prev };
        if (nextDirection === 'backward' && !prev['结束'] && draft['结束']) nextSources['结束'] = 'system_auto';
        linked.autoKeys.forEach((autoKey) => {
          nextSources[autoKey] = 'system_auto';
        });
        emitDraftState(linked.formData, nextDirection, nextSources);
        return nextSources;
      });
      return linked.formData;
    });
  };

  const handleBlockChange = (newBlockId: string) => {
    if (newBlockId === currentBlockId) return;
    const preserved: Record<string, any> = {};
    const preservedSources: QuickInputFieldSourceMap = {};
    ['内容', 'content', '日期', 'date', '时间', 'time', '备注', 'note', 'description', '目标', '目标ID', 'goalId', 'goalPath', 'themePath', '主题'].forEach((k) => {
      if (formData[k] !== undefined) preserved[k] = formData[k];
      if (fieldSources[k]) preservedSources[k] = fieldSources[k];
    });
    setSelectedTemplateVariantId(null);
    setCurrentBlockId(newBlockId);
    setFormData(preserved);
    setFieldSources(preservedSources);
    setTimeDirection('forward');
  };

  const handleSelectTheme = (themeId: string | null, path: string | null) => {
    // 清空
    if (!themeId || !path) {
      setSelectedThemeId(null);
      return;
    }

    // 兼容旧交互：重复点击同一主题 → 回到父主题
    if (selectedThemeId === themeId) {
      const parentPath = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
      const parentThemeId = parentPath ? pathToIdMap.get(parentPath) ?? null : null;
      setSelectedThemeId(parentThemeId);
      return;
    }

    setSelectedThemeId(themeId);
  };


  const handleCreateGoal = async (goalPath: string) => {
    const normalized = cleanDisplayPath(goalPath);
    if (!normalized) return;
    const title = normalized.split('/').filter(Boolean).pop() || normalized;
    const effectiveThemePath = String(formData.themePath ?? formData['主题'] ?? theme?.path ?? selectedGoal?.themePath ?? '').trim() || null;
    const goal = await useCases.goal.addGoal({ title, goalPath: normalized, themePath: effectiveThemePath });
    if (!goal) return;
    handleSelectGoal({
      id: goal.id,
      value: goal.goalPath || normalized,
      label: goal.title,
      goal,
      themePath: goal.themePath || null,
    });
  };

  const handleSelectGoal = (option: GoalSelectorOption | null) => {
    if (!option || !option.value) {
      setSelectedGoalId(null);
      setSelectedGoalPath(null);
      setSelectedTemplateVariantId(null);
      return;
    }
    const goal = option.goal || null;
    const goalPath = cleanDisplayPath(goal?.goalPath || option.value);
    const goalId = goal?.id || (option.id && !String(option.id).startsWith('goal:') ? option.id : makeGoalIdFromPath(goalPath || option.value));
    const themePath = goal?.themePath || option.themePath || null;
    setSelectedGoalId(goalId);
    setSelectedGoalPath(goalPath || option.value);
    setSelectedTemplateVariantId(null);
    if (themePath) setSelectedThemeId(pathToIdMap.get(themePath) ?? null);

    setFormData((cur) => {
      const next = { ...cur };
      const nextSources: QuickInputFieldSourceMap = { ...fieldSources };
      const assign = (key: string, value: unknown, source: QuickInputFieldSource = 'goal_context') => {
        if (value === undefined || value === null || value === '') return;
        const currentSource = nextSources[key];
        const hasUserValue = currentSource === 'user' && isMeaningfulValue(next[key]);
        if (hasUserValue) return;
        next[key] = value;
        nextSources[key] = source;
      };
      assign('goalId', goalId);
      assign('目标ID', goalId);
      assign('goalPath', goalPath || option.value);
      assign('目标', goalPath || option.value);
      const parts = splitGoalPath(cleanDisplayPath(goalPath || option.value) || '');
      assign('rootGoal', parts.rootGoal || '', 'goal_context');
      assign('leafGoal', parts.leafGoal || '', 'goal_context');
      if (themePath) {
        assign('themePath', themePath, 'goal_context');
        assign('主题', themePath, 'goal_context');
      }
      setSelectedCycleId(null);
      setFieldSources(nextSources);
      return next;
    });
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
      templateVariants={goalTemplateVariants.map((template) => ({ value: template.variantId || 'default', label: template.name || template.variantId || '默认模板', isDefault: !!template.isDefault }))}
      selectedTemplateVariantId={resolvedTemplateVariantId || selectedTemplateVariantId}
      onSelectTemplateVariant={setSelectedTemplateVariantId}
      cycles={[]}
      selectedCycleId={currentPeriod?.id || null}
      onSelectCycle={undefined}
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
      fieldSourceSummary={buildFieldSourceSummary(fieldSources)}
    />
  );
}
