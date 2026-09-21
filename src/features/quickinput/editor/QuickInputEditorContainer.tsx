/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useReducer, useRef } from 'preact/hooks';

import { selectSettings, useDataStore, useSelector } from '@/app/public';
import { dayjs } from '@core/utils/public';
import { getTemplateFieldSemantic } from '@core/fields/public';
import { getEffectiveRecordTypes, ENERGY_RECORD_TYPE_ID } from '@core/recordTypes/public';
import { normalizeGoalPath, resolveDerivedPeriod, resolveTemplatePeriodPolicy } from '@core/goal/public';
import { getCreateAvailableRecordTypes, initializeRecordInputSession, reduceRecordInputSession, resolveRecordGoalPath } from '@core/recordInput/public';
import { QuickInputEditorView } from './QuickInputEditorView';
import { resolveQuickInputRecordTypeRuntime, shouldRequireDirectGoalTemplateForQuickInput } from './quickInputRecordTypeModel';
import { EnergyQuickCapturePanel } from './components/EnergyQuickCapturePanel';
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
  deriveQuickInputInitialSelection,
  getGoalPath,
  hydrateQuickInputTemplateDefaults,
  resolveQuickInputRecordTypeId,
  resolveTaskQuickInputTimingMode,
  shouldShowQuickInputTimeDirectionControl,
  splitPathParts,
} from './QuickInputEditorModel';
import type { QuickInputEditorProps, QuickInputFieldSourceMap, QuickInputFormData, TimeDirection } from './QuickInputEditorModel';
import type { RecordViewItem } from '@core/types/public';
export { finalizeQuickInputFormData } from './QuickInputEditorModel';
export type { QuickInputEditorProps, QuickInputEditorState } from './QuickInputEditorModel';

function getRecentGoalPresetContent(item: RecordViewItem): string {
  const content = item.recordType === 'task'
    ? item.editableText || item.title || item.content
    : item.editableText || item.content || item.title;
  return String(content || '').trim();
}

export function QuickInputEditor({
  getResourcePath,
  initialRecordTypeId,
  context,
  initialFormData,
  recordInputMode = 'create',
  allowRecordTypeSwitch = true,
  dense = false,
  showDivider = true,
  onStateChange,
  onRequestSubmit,
  onEnergyCapture,
  isMobileLike = false,
  autoFocusContent = false,
}: QuickInputEditorProps) {
  const fullSettings = useSelector(selectSettings);
  const dataStore = useDataStore();
  const initialFieldSource = recordInputMode === 'create' ? 'context' : 'edit_backfill';
  const recordInputModeRef = useRef(recordInputMode);
  const [session, dispatchSession] = useReducer(
    reduceRecordInputSession,
    initializeRecordInputSession({
      mode: recordInputMode,
      initialRecordTypeId,
      initialFormData: initialFormData ?? EMPTY_FORM_DATA,
      initialFieldSources: buildInitialFieldSources(initialFormData, initialFieldSource),
      initialSelection: deriveQuickInputInitialSelection(initialFormData, context),
    }),
  );

  const {
    currentRecordTypeId,
    selectedGoalPath,
    formData,
    fieldSources,
    timeDirection,
  } = session;

  // 不要依赖 initialFormData（可能是新对象）→ 用 block/context 变化作为 reset 语义。
  useEffect(() => {
    const modeForReset = recordInputModeRef.current;
    const sourceForReset = modeForReset === 'create' ? 'context' : 'edit_backfill';
    dispatchSession({
      type: 'reset',
      payload: {
        mode: modeForReset,
        initialRecordTypeId,
        initialFormData: initialFormData ?? EMPTY_FORM_DATA,
        initialFieldSources: buildInitialFieldSources(initialFormData, sourceForReset),
        initialSelection: deriveQuickInputInitialSelection(initialFormData, context),
      },
    });
  }, [initialRecordTypeId, context]);

  useEffect(() => {
    recordInputModeRef.current = recordInputMode;
    dispatchSession({ type: 'setMode', mode: recordInputMode });
  }, [recordInputMode]);

  const recordTypes = useMemo(() => {
    if (recordInputMode !== 'create') return getEffectiveRecordTypes();
    // RecordType navigation is a global create-surface capability, not a
    // property of the currently selected Goal. Goal compatibility is handled
    // by goalOptions/template resolution after the user switches type.
    //
    // Filtering this list by selectedGoalPath made the switcher shrink after a
    // Goal selection and, for direct Energy capture, often reduced it to the
    // single Energy type. That is why entering Energy could strand the user in
    // a panel with no way to switch back.
    return getCreateAvailableRecordTypes(fullSettings);
  }, [fullSettings.goalSettings?.goalTemplates, recordInputMode]);
  const currentRecordType = useMemo(
    () => recordTypes.find((recordType) => recordType.id === currentRecordTypeId) || null,
    [recordTypes, currentRecordTypeId],
  );
  const isEnergyDirect = currentRecordType?.id === ENERGY_RECORD_TYPE_ID && currentRecordType.captureMode === 'direct';
  const recentGoalContentByPath = useMemo(() => {
    if (recordInputMode !== 'create' || isEnergyDirect) return {} as Record<string, string>;

    const recentPaths = (fullSettings.recentGoalPaths || [])
      .map((path) => normalizeGoalPath(path))
      .filter((path): path is string => Boolean(path))
      .slice(0, 5);
    if (recentPaths.length === 0) return {} as Record<string, string>;

    const recordType = currentRecordType?.recordType
      || String(currentRecordTypeId || '').replace(/^core\./, '');
    if (!recordType) return {} as Record<string, string>;

    const wantedPaths = new Set(recentPaths);
    const contentByPath: Record<string, string> = {};
    const records = dataStore.queryRecords()
      .filter((item) => item.recordType === recordType)
      .sort((left, right) => (right.modified || right.created || 0) - (left.modified || left.created || 0));

    for (const item of records) {
      const goalPath = resolveRecordGoalPath({ item });
      if (!goalPath || !wantedPaths.has(goalPath) || contentByPath[goalPath]) continue;
      const content = getRecentGoalPresetContent(item);
      if (!content) continue;
      contentByPath[goalPath] = content;
      if (Object.keys(contentByPath).length >= wantedPaths.size) break;
    }
    return contentByPath;
  }, [
    currentRecordType?.recordType,
    currentRecordTypeId,
    dataStore,
    fullSettings.recentGoalPaths,
    isEnergyDirect,
    recordInputMode,
  ]);
  const requireDirectGoalTemplate = shouldRequireDirectGoalTemplateForQuickInput(recordInputMode, isEnergyDirect);
  const selectedGoal = useMemo(() => {
    const goals = fullSettings.goalSettings?.goals || [];
    return selectedGoalPath ? goals.find((goal) => getGoalPath(goal) === selectedGoalPath) || null : null;
  }, [fullSettings.goalSettings?.goals, selectedGoalPath]);

  const currentEffectiveRecordTypeIdForTemplates = useMemo(
    () => isEnergyDirect ? '' : resolveQuickInputRecordTypeId(fullSettings, currentRecordTypeId),
    [currentRecordTypeId, isEnergyDirect]
  );

  const { template: rawTemplate, goal: resolvedGoal, templateId, templateSourceType, effectiveRecordTypeId } = useMemo(
    () => resolveQuickInputRecordTypeRuntime({ settings: fullSettings, isEnergyDirect, currentRecordTypeId, selectedGoal, selectedGoalPath, requireDirectGoalTemplate }),
    [fullSettings, isEnergyDirect, currentRecordTypeId, selectedGoal, selectedGoalPath, recordInputMode],
  );

  // Goal is one field in the form, not a separate pre-form screen. For create
  // mode we can render the RecordType base fields before a Goal is chosen, while
  // the submit boundary still requires a valid Goal x RecordType template.
  const baseDisplayRuntime = useMemo(
    () => resolveQuickInputRecordTypeRuntime({
      settings: fullSettings,
      isEnergyDirect,
      currentRecordTypeId,
      selectedGoal: null,
      selectedGoalPath: null,
      requireDirectGoalTemplate: false,
    }),
    [fullSettings, isEnergyDirect, currentRecordTypeId],
  );

  const displayRawTemplate = rawTemplate || baseDisplayRuntime.template;
  const displayTemplateId = rawTemplate ? templateId : baseDisplayRuntime.templateId;
  const displayTemplateSourceType = rawTemplate ? templateSourceType : baseDisplayRuntime.templateSourceType;
  const displayEffectiveRecordTypeId = rawTemplate ? effectiveRecordTypeId : baseDisplayRuntime.effectiveRecordTypeId;

  const goalOptions = useMemo<GoalSelectorOption[]>(
    () => buildQuickInputGoalOptions(
      fullSettings,
      currentRecordTypeId,
      requireDirectGoalTemplate,
    ),
    [fullSettings.goalSettings?.goals, fullSettings.goalSettings?.goalTemplates, currentRecordTypeId, requireDirectGoalTemplate]
  );

  const goalFieldOptions = useMemo(() => goalOptions.map((goal) => ({ value: goal.value, label: goal.label || goal.value })), [goalOptions]);

  useEffect(() => {
    const selectedPath = getGoalPath(selectedGoal) || selectedGoalPath || null;
    if (!selectedPath) return;
    const stillVisible = goalOptions.some((option) => option.value === selectedPath);
    if (stillVisible) return;
    dispatchSession({ type: 'clearGoalContext' });
  }, [goalOptions, selectedGoal?.path, selectedGoalPath]);

  const currentGoalPath = selectedGoalPath || getGoalPath(selectedGoal || resolvedGoal) || null;
  const currentGoalTitle = currentGoalPath ? currentGoalPath.split('/').filter(Boolean).pop() || currentGoalPath : null;
  const currentGoalParts = splitPathParts(currentGoalPath);
  const currentRecordDate = String(formData['日期'] ?? formData.date ?? dayjs().format('YYYY-MM-DD')).trim();
  const periodPolicy = isEnergyDirect ? null : resolveTemplatePeriodPolicy(displayRawTemplate as any);
  const currentPeriod = periodPolicy ? resolveDerivedPeriod(currentRecordDate || dayjs().format('YYYY-MM-DD'), periodPolicy.granularity) : null;
  const currentPeriodUi = useMemo(() => buildQuickInputPeriodUi(currentPeriod), [currentPeriod?.id, currentPeriod?.label, currentPeriod?.granularity]);
  const currentPeriodFields = currentPeriodUi.fields;
  const currentPeriodOptions = currentPeriodUi.options;

  const taskTimingMode = useMemo(() => resolveTaskQuickInputTimingMode({
    context,
    formData,
    recordInputMode: recordInputMode === 'create' ? 'create' : 'edit',
    effectiveRecordTypeId: displayEffectiveRecordTypeId || currentRecordTypeId,
  }), [context, formData.status, formData['状态'], recordInputMode, displayEffectiveRecordTypeId, currentRecordTypeId]);

  const template = useMemo(
    () => {
      if (isEnergyDirect) return null;
      // Goal is only one field inside the complete form. Always render the
      // RecordType base form before Goal selection (and for stale Goal context);
      // the modal submit boundary separately requires a direct GoalTemplate in
      // create mode, so showing fields never weakens persistence rules.
      return buildQuickInputDisplayTemplate(displayRawTemplate, displayEffectiveRecordTypeId, goalFieldOptions, { taskTimingMode, recordInputMode: recordInputMode === 'create' ? 'create' : 'edit' });
    },
    [displayRawTemplate, displayEffectiveRecordTypeId, goalFieldOptions, isEnergyDirect, taskTimingMode, recordInputMode]
  );

  const showTimeDirectionControl = useMemo(() => shouldShowQuickInputTimeDirectionControl(template), [template]);

  useEffect(() => {
    if (isEnergyDirect || !template) return;
    const hydrated = hydrateQuickInputTemplateDefaults({
      template,
      context,
      current: formData,
      fieldSources,
      selectedGoal,
      currentGoalPath,
      currentGoalTitle,
      currentPeriod,
      timeDirection,
    });
    if (!hydrated.changed) return;
    dispatchSession({
      type: 'hydrateDefaults',
      formData: hydrated.formData,
      fieldSources: hydrated.fieldSources,
    });
  }, [template, context, timeDirection, selectedGoalPath, currentPeriod?.id, currentPeriod?.label, currentGoalPath, currentGoalTitle, formData, fieldSources, isEnergyDirect]);



  const makeEditorState = (draftFormData: QuickInputFormData, directionOverride: TimeDirection = timeDirection, sourceOverride: QuickInputFieldSourceMap = fieldSources) => buildQuickInputEditorState({
    recordTypeId: currentRecordTypeId,
    effectiveRecordTypeId: isEnergyDirect ? ENERGY_RECORD_TYPE_ID : effectiveRecordTypeId,
    selectedGoal,
    currentGoalPath,
    currentGoalTitle,
    currentGoalParts,
    currentPeriod,
    formData: draftFormData,
    currentPeriodFields,
    timeDirection: directionOverride,
    template,
    templateId: displayTemplateId,
    templateSourceType: displayTemplateSourceType,
    fieldSources: sourceOverride,
  });

  useEffect(() => {
    onStateChange?.(makeEditorState(formData, timeDirection, fieldSources));
  }, [currentRecordTypeId, effectiveRecordTypeId, selectedGoalPath, currentGoalPath, currentGoalTitle, currentGoalParts.root, currentGoalParts.leaf, formData, timeDirection, template, displayTemplateId, displayTemplateSourceType, fieldSources]);

  const handleUpdateField = (key: string, value: any, isOptionObject = false) => {
    const updated = applyQuickInputFieldUpdate({ formData, fieldSources, key, value, isOptionObject, timeDirection });
    dispatchSession({
      type: 'updateDraft',
      formData: updated.formData,
      fieldSources: updated.fieldSources,
      selectedGoalPath: updated.nextGoalPath !== undefined ? updated.nextGoalPath : undefined,
    });
  };

  const handleTimeDirectionChange = (nextDirection: TimeDirection) => {
    const isTaskTimeForm = String(displayEffectiveRecordTypeId || currentRecordTypeId || '').replace(/^core\./, '') === 'task';
    const updated = applyQuickInputTimeDirectionChange({
      formData,
      fieldSources,
      nextDirection,
      timeFieldSet: isTaskTimeForm ? 'task' : 'legacy',
    });
    dispatchSession({
      type: 'changeTimeDirection',
      timeDirection: updated.timeDirection,
      formData: updated.formData,
      fieldSources: updated.fieldSources,
    });
  };

  const handleRecordTypeChange = (newRecordTypeId: string) => {
    if (newRecordTypeId === currentRecordTypeId || newRecordTypeId === currentEffectiveRecordTypeIdForTemplates) return;
    dispatchSession({ type: 'switchRecordType', recordTypeId: newRecordTypeId });
  };

  const handleSelectGoal = (
    option: GoalSelectorOption | null,
    source: 'hierarchy' | 'recent' = 'hierarchy',
  ) => {
    if (!option || !option.value) {
      dispatchSession({ type: 'clearGoalContext' });
      return;
    }

    const nextSelection = applyQuickInputGoalSelection({ formData, fieldSources, option });
    let nextFormData = nextSelection.formData;
    let nextFieldSources = nextSelection.fieldSources;

    // A recent Goal chip is a preset: select the Goal and restore the latest
    // body recorded under that Goal. Hierarchy clicks remain Goal-only so they
    // never overwrite content the user is currently editing.
    if (source === 'recent') {
      const presetContent = recentGoalContentByPath[nextSelection.goalPath];
      if (presetContent) {
        const targetRuntime = resolveQuickInputRecordTypeRuntime({
          settings: fullSettings,
          isEnergyDirect,
          currentRecordTypeId,
          selectedGoal: option.goal || null,
          selectedGoalPath: nextSelection.goalPath,
          requireDirectGoalTemplate,
        });
        const targetTemplate = targetRuntime.template || baseDisplayRuntime.template;
        const bodyFieldKey = String(
          targetTemplate?.fields?.find((field: any) => getTemplateFieldSemantic(field) === 'body')?.key || '',
        ).trim();
        if (bodyFieldKey) {
          const updated = applyQuickInputFieldUpdate({
            formData: nextFormData,
            fieldSources: nextFieldSources,
            key: bodyFieldKey,
            value: presetContent,
            isOptionObject: false,
            timeDirection,
          });
          nextFormData = updated.formData;
          nextFieldSources = updated.fieldSources;
        }
      }
    }

    dispatchSession({
      type: 'selectGoal',
      goalPath: nextSelection.goalPath,
      formData: nextFormData,
      fieldSources: nextFieldSources,
    });
  };

  if (isEnergyDirect) {
    return (
      <EnergyQuickCapturePanel
        recordTypes={recordTypes}
        allowRecordTypeSwitch={allowRecordTypeSwitch}
        currentRecordTypeId={currentRecordTypeId}
        onRecordTypeChange={handleRecordTypeChange}
        goals={goalOptions}
        selectedGoalPath={currentGoalPath}
        onSelectGoal={handleSelectGoal}
        defaultGoalPath={fullSettings.energySettings?.defaultGoalPath || null}
        onCapture={onEnergyCapture}
      />
    );
  }

  return (
    <QuickInputEditorView
      getResourcePath={getResourcePath}
      recordTypes={recordTypes}
      allowRecordTypeSwitch={allowRecordTypeSwitch}
      currentRecordTypeId={currentEffectiveRecordTypeIdForTemplates || currentRecordTypeId}
      onRecordTypeChange={handleRecordTypeChange}
      goals={goalOptions}
      recentGoalPaths={fullSettings.recentGoalPaths || []}
      selectedGoalPath={currentGoalPath}
      onSelectGoal={handleSelectGoal}
      onCreateGoal={undefined}
      template={template}
      formData={formData}
      fieldValueOptionsByKey={currentPeriodOptions}
      timeDirection={timeDirection}
      dense={dense}
      showDivider={showDivider}
      onUpdateField={handleUpdateField}
      onTimeDirectionChange={handleTimeDirectionChange}
      onRequestSubmit={onRequestSubmit}
      isMobileLike={isMobileLike}
      showTimeDirectionControl={showTimeDirectionControl}
      currentPeriodLabel={currentPeriod?.label || null}
      fieldSourceSummary={makeEditorState(formData, timeDirection, fieldSources).fieldSourceSummary}
      autoFocusContent={autoFocusContent}
    />
  );
}
