/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useReducer, useRef } from 'preact/hooks';

import { selectSettings, useSelector } from '@/app/public';
import { dayjs } from '@core/utils/public';
import { getEffectiveRecordTypes, ENERGY_RECORD_TYPE_ID } from '@core/recordTypes/public';
import { normalizeGoalPath, resolveDerivedPeriod, resolveTemplatePeriodPolicy } from '@core/goal/public';
import { getCreateEligibleGoalPaths, initializeRecordInputSession, reduceRecordInputSession } from '@core/recordInput/public';
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
export { finalizeQuickInputFormData } from './QuickInputEditorModel';
export type { QuickInputEditorProps, QuickInputEditorState } from './QuickInputEditorModel';

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
    const all = getEffectiveRecordTypes();
    if (recordInputMode !== 'create') return all;
    const selectedPath = normalizeGoalPath(selectedGoalPath) || '';
    return all.filter((recordType) => {
      if (recordType.captureMode === 'direct') return true;
      const eligibleGoalPaths = getCreateEligibleGoalPaths(fullSettings, recordType.id);
      return selectedPath ? eligibleGoalPaths.includes(selectedPath) : eligibleGoalPaths.length > 0;
    });
  }, [fullSettings.goalSettings?.goalTemplates, selectedGoalPath, recordInputMode]);
  const currentRecordType = useMemo(
    () => recordTypes.find((recordType) => recordType.id === currentRecordTypeId) || null,
    [recordTypes, currentRecordTypeId],
  );
  const isEnergyDirect = currentRecordType?.id === ENERGY_RECORD_TYPE_ID && currentRecordType.captureMode === 'direct';
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

  const handleSelectGoal = (option: GoalSelectorOption | null) => {
    if (!option || !option.value) {
      dispatchSession({ type: 'clearGoalContext' });
      return;
    }
    const nextSelection = applyQuickInputGoalSelection({ formData, fieldSources, option });
    dispatchSession({
      type: 'selectGoal',
      goalPath: nextSelection.goalPath,
      formData: nextSelection.formData,
      fieldSources: nextSelection.fieldSources,
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
      currentGoalPath={currentGoalPath}
      templateSourceType={displayTemplateSourceType}
      fieldSourceSummary={makeEditorState(formData, timeDirection, fieldSources).fieldSourceSummary}
      autoFocusContent={autoFocusContent}
    />
  );
}
