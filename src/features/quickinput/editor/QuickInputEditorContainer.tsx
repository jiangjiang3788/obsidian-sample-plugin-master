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
  shouldShowQuickInputTimeDirectionControl,
  splitPathParts,
} from './QuickInputEditorModel';
import type { QuickInputEditorProps, QuickInputFieldSourceMap, QuickInputFormData, TimeDirection } from './QuickInputEditorModel';
export { finalizeQuickInputFormData } from './QuickInputEditorModel';
export type { QuickInputEditorProps, QuickInputEditorState } from './QuickInputEditorModel';

export function QuickInputEditor({
  getResourcePath,
  initialBlockId,
  context,
  initialFormData,
  recordInputMode = 'create',
  allowBlockSwitch = true,
  dense = false,
  showDivider = true,
  onStateChange,
  onRequestSubmit,
  onEnergyCapture,
  isMobileLike = false,
}: QuickInputEditorProps) {
  const fullSettings = useSelector(selectSettings);
  const initialFieldSource = recordInputMode === 'create' ? 'context' : 'edit_backfill';
  const recordInputModeRef = useRef(recordInputMode);
  const [session, dispatchSession] = useReducer(
    reduceRecordInputSession,
    initializeRecordInputSession({
      mode: recordInputMode,
      initialBlockId,
      initialFormData: initialFormData ?? EMPTY_FORM_DATA,
      initialFieldSources: buildInitialFieldSources(initialFormData, initialFieldSource),
      initialSelection: deriveQuickInputInitialSelection(initialFormData, context),
    }),
  );

  const {
    currentBlockId,
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
        initialBlockId,
        initialFormData: initialFormData ?? EMPTY_FORM_DATA,
        initialFieldSources: buildInitialFieldSources(initialFormData, sourceForReset),
        initialSelection: deriveQuickInputInitialSelection(initialFormData, context),
      },
    });
  }, [initialBlockId, context]);

  useEffect(() => {
    recordInputModeRef.current = recordInputMode;
    dispatchSession({ type: 'setMode', mode: recordInputMode });
  }, [recordInputMode]);

  const blocks = useMemo(() => {
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
    () => blocks.find((recordType) => recordType.id === currentBlockId) || null,
    [blocks, currentBlockId],
  );
  const isEnergyDirect = currentRecordType?.id === ENERGY_RECORD_TYPE_ID && currentRecordType.captureMode === 'direct';
  const requireDirectGoalTemplate = shouldRequireDirectGoalTemplateForQuickInput(recordInputMode, isEnergyDirect);
  const selectedGoal = useMemo(() => {
    const goals = fullSettings.goalSettings?.goals || [];
    return selectedGoalPath ? goals.find((goal) => getGoalPath(goal) === selectedGoalPath) || null : null;
  }, [fullSettings.goalSettings?.goals, selectedGoalPath]);

  const currentEffectiveBlockIdForTemplates = useMemo(
    () => isEnergyDirect ? '' : resolveQuickInputRecordTypeId(fullSettings, currentBlockId),
    [currentBlockId, isEnergyDirect]
  );

  const { template: rawTemplate, goal: resolvedGoal, templateId, templateSourceType, effectiveBlockId } = useMemo(
    () => resolveQuickInputRecordTypeRuntime({ settings: fullSettings, isEnergyDirect, currentBlockId, selectedGoal, selectedGoalPath, requireDirectGoalTemplate }),
    [fullSettings, isEnergyDirect, currentBlockId, selectedGoal, selectedGoalPath, recordInputMode],
  );

  // Goal is one field in the form, not a separate pre-form screen. For create
  // mode we can render the RecordType base fields before a Goal is chosen, while
  // the submit boundary still requires a valid Goal x RecordType template.
  const baseDisplayRuntime = useMemo(
    () => resolveQuickInputRecordTypeRuntime({
      settings: fullSettings,
      isEnergyDirect,
      currentBlockId,
      selectedGoal: null,
      selectedGoalPath: null,
      requireDirectGoalTemplate: false,
    }),
    [fullSettings, isEnergyDirect, currentBlockId],
  );

  const displayRawTemplate = rawTemplate || baseDisplayRuntime.template;
  const displayTemplateId = rawTemplate ? templateId : baseDisplayRuntime.templateId;
  const displayTemplateSourceType = rawTemplate ? templateSourceType : baseDisplayRuntime.templateSourceType;
  const displayEffectiveBlockId = rawTemplate ? effectiveBlockId : baseDisplayRuntime.effectiveBlockId;

  const goalOptions = useMemo<GoalSelectorOption[]>(
    () => buildQuickInputGoalOptions(
      fullSettings,
      currentBlockId,
      requireDirectGoalTemplate,
    ),
    [fullSettings.goalSettings?.goals, fullSettings.goalSettings?.goalTemplates, currentBlockId, requireDirectGoalTemplate]
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

  const template = useMemo(
    () => {
      if (isEnergyDirect) return null;
      // Goal is only one field inside the complete form. Always render the
      // RecordType base form before Goal selection (and for stale Goal context);
      // the modal submit boundary separately requires a direct GoalTemplate in
      // create mode, so showing fields never weakens persistence rules.
      return buildQuickInputDisplayTemplate(displayRawTemplate, displayEffectiveBlockId, goalFieldOptions);
    },
    [displayRawTemplate, displayEffectiveBlockId, goalFieldOptions, isEnergyDirect]
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
    blockId: currentBlockId,
    effectiveBlockId: isEnergyDirect ? ENERGY_RECORD_TYPE_ID : effectiveBlockId,
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
  }, [currentBlockId, effectiveBlockId, selectedGoalPath, currentGoalPath, currentGoalTitle, currentGoalParts.root, currentGoalParts.leaf, formData, timeDirection, template, displayTemplateId, displayTemplateSourceType, fieldSources]);

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
        blocks={blocks}
        allowBlockSwitch={allowBlockSwitch}
        currentBlockId={currentBlockId}
        onBlockChange={handleBlockChange}
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
      blocks={blocks}
      allowBlockSwitch={allowBlockSwitch}
      currentBlockId={currentEffectiveBlockIdForTemplates || currentBlockId}
      onBlockChange={handleBlockChange}
      goals={goalOptions}
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
    />
  );
}
