/** @jsxImportSource preact */
import { h } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useDataStore, useUseCases } from '@/app/public';
import type { RecordViewItem, QuickInputSaveData } from '@core/types/public';
import { getRecordTypeById, ENERGY_RECORD_TYPE_ID } from '@core/recordTypes/public';
import type { QuickInputEnergyCaptureRequest } from '../editor/QuickInputEditorModel';
import { dayjs } from '@core/utils/public';
import { buildRecordSubmitFeedbackPresentation } from '@core/utils/public';
import type { RecordInputSource, RecordSubmitResult } from '@core/recordInput/public';
import { QuickInputEditor, type QuickInputEditorState } from '../editor';
import { QuickInputConflictRecoveryPanel } from './QuickInputConflictRecoveryPanel';
import { QuickInputModalFooter } from './QuickInputModalFooter';
import { QuickInputModalHeader } from './QuickInputModalHeader';
import { isMobileLikeEnvironment } from './quickInputEnvironment';
import type { QuickInputOperationMode } from './quickInputOperationMode';
import { useQuickInputOriginalNavigation } from './quickInputOriginalLink';
import type { ShowQuickInputNotice } from './quickInputNotice';
import { useQuickInputOutputPlan } from './useQuickInputOutputPlan';
import { useQuickInputSubmitController } from './useQuickInputSubmit';
import { RecurringTaskSeriesEditor } from './RecurringTaskSeriesEditor';
import { normalizeRecurrenceInfo, normalizeTaskStatus, type RecurrenceInfo, type TaskLifecycleCommand } from '@core/records/public';
import { TaskLifecycleEditor } from './TaskLifecycleEditor';
export interface QuickInputModalContentProps {
  getResourcePath: (path: string) => string;
  initialRecordTypeId: string;
  context?: Record<string, unknown>;
  onSave?: (data: QuickInputSaveData) => void;
  closeModal: () => void;
  allowRecordTypeSwitch: boolean;
  mode: 'create' | 'edit';
  editItem?: RecordViewItem;
  source?: Extract<RecordInputSource, 'quickinput' | 'view_quick_create' | 'timer' | 'unknown'>;
  vaultName: string;
  onSubmitSuccess?: (result: RecordSubmitResult, draft: QuickInputSaveData) => void | Promise<void>;
  showNotice: ShowQuickInputNotice;
}
export function QuickInputModalContent({
  getResourcePath,
  initialRecordTypeId,
  context,
  onSave,
  closeModal,
  allowRecordTypeSwitch,
  mode,
  editItem,
  source,
  vaultName,
  onSubmitSuccess,
  showNotice,
}: QuickInputModalContentProps) {
  const useCases = useUseCases();
  const dataStore = useDataStore();
  const preparedRecord = useMemo(() => {
    if (mode === 'edit' && editItem) {
      return useCases.recordInput.prepareEditRecord({
        item: editItem,
        recordTypeId: initialRecordTypeId,
        source: 'quickinput',
      });
    }
    return useCases.recordInput.prepareCreateRecord({
      recordTypeId: initialRecordTypeId,
      context,
      source: onSave ? 'timer' : (source ?? 'quickinput'),
    });
  }, [useCases, initialRecordTypeId, context, mode, editItem, onSave, source]);
  const [isRescanningRecoveryPaths, setIsRescanningRecoveryPaths] = useState(false);
  const [isStoppingSeries, setIsStoppingSeries] = useState(false);
  const [isSkippingRecurringTask, setIsSkippingRecurringTask] = useState(false);
  const [isChangingTaskLifecycle, setIsChangingTaskLifecycle] = useState(false);
  const [editOperationMode, setEditOperationMode] = useState<Extract<QuickInputOperationMode, 'edit' | 'convert' | 'duplicate'>>('edit');
  const initialSeriesRecurrence: RecurrenceInfo = normalizeRecurrenceInfo(editItem?.recurrenceInfo) || { unit: 'day', interval: 1, anchor: 'scheduled' };
  const [taskSeriesRecurrence, setTaskSeriesRecurrence] = useState<RecurrenceInfo>(initialSeriesRecurrence);
  const [editorResetVersion, setEditorResetVersion] = useState(0);
  const operationMode: QuickInputOperationMode = mode === 'create' ? 'create' : editOperationMode;
  const editorSessionMode = operationMode;
  const outputPlanMode: 'create' | 'edit' = operationMode === 'duplicate' ? 'create' : mode;
  const [editorState, setEditorState] = useState<QuickInputEditorState>({
    recordTypeId: preparedRecord.recordTypeId || initialRecordTypeId,
    formData: preparedRecord.initialFormData,
    meta: { timeDirection: 'forward' },
    template: null,
    templateId: null,
    templateSourceType: null,
  });
  const editorStateRef = useRef<QuickInputEditorState | null>(null);
  const isMobileLike = useMemo(() => isMobileLikeEnvironment(), []);
  const editIdentity = `${mode}:${editItem?.id ?? ''}`;
  const previousEditIdentityRef = useRef(editIdentity);
  useEffect(() => {
    if (previousEditIdentityRef.current === editIdentity) return;
    previousEditIdentityRef.current = editIdentity;
    setEditOperationMode('edit');
    setTaskSeriesRecurrence(normalizeRecurrenceInfo(editItem?.recurrenceInfo) || { unit: 'day', interval: 1, anchor: 'scheduled' });
    setEditorResetVersion((version) => version + 1);
  }, [editIdentity, editItem?.recurrenceInfo]);
  const handleOperationModeChange = useCallback((nextMode: QuickInputOperationMode) => {
    if (nextMode === 'create') return;
    setEditOperationMode((previousMode) => {
      if (nextMode === 'edit' && previousMode !== 'edit') {
        setEditorResetVersion((version) => version + 1);
      }
      return nextMode;
    });
  }, []);
  const currentState = editorStateRef.current || editorState;
  const currentRecordType = getRecordTypeById(currentState.recordTypeId);
  const currentRecordTypeRequiresGoal = currentRecordType?.capabilities.goalBindable === true;
  const createRequiresDirectGoalTemplate = mode === 'create'
    && currentState.recordTypeId !== ENERGY_RECORD_TYPE_ID
    && currentRecordTypeRequiresGoal;
  const canSubmit = Boolean(
    currentState.recordTypeId
      && currentState.template
      && (!currentRecordTypeRequiresGoal || currentState.goalPath)
      && (!createRequiresDirectGoalTemplate || currentState.templateSourceType === 'goal-template'),
  );
  const currentRecordTypeName = currentRecordType?.name || currentState.template?.name || currentState.recordTypeId || '请选择记录类型';
  const isRecurringTaskEdit = operationMode === 'edit'
    && editItem?.recordType === 'task'
    && Boolean(String(editItem.seriesId || '').trim())
    && Boolean(normalizeRecurrenceInfo(editItem.recurrenceInfo));
  const taskSeriesEditIntent = isRecurringTaskEdit
    ? { scope: 'current_and_future' as const, recurrence: taskSeriesRecurrence }
    : null;
  const isEnergyDirect = mode === 'create' && currentState.recordTypeId === ENERGY_RECORD_TYPE_ID;
  const isTimerCreate = mode === 'create' && (source === 'timer' || !!onSave);
  const {
    liveOutputPlan,
    livePersistencePlan,
  } = useQuickInputOutputPlan({ currentState, preparedRecord, editItem, mode: outputPlanMode, context });
  const {
    originalGestureHint,
    openOriginal,
    handleOriginalPointerClick,
    handleOriginalTouchEnd,
  } = useQuickInputOriginalNavigation({ mode, editItem, vaultName, showNotice });
  const getCurrentState = useCallback(() => editorStateRef.current || editorState, [editorState]);
  const {
    pendingAction,
    isBusy,
    handleSubmit,
    handleDelete,
    handleSubmitPointerDown,
    preserveDesktopInputFocus,
    recovery,
    clearRecovery,
  } = useQuickInputSubmitController({
    operationMode,
    editItem,
    context,
    source,
    onSave,
    onSubmitSuccess,
    closeModal,
    useCases,
    getCurrentState,
    liveOutputPlan,
    livePersistencePlan,
    isMobileLike,
    showNotice,
    taskSeriesEditIntent,
  });
  const handleEditorStateChange = useCallback((state: QuickInputEditorState) => {
    editorStateRef.current = state;
    setEditorState(state);
  }, []);
  const handleSkipRecurringTask = useCallback(async () => {
    const itemId = String(editItem?.id || '').trim();
    if (!itemId || isSkippingRecurringTask) return;
    if (!window.confirm('确认跳过本次周期任务吗？本次会标记为已跳过，并按系列规则生成下一次任务。')) return;
    setIsSkippingRecurringTask(true);
    try {
      const result = await useCases.taskRuntime.runLifecycle({ taskId: itemId, command: 'skip', source: 'quickinput' });
      const presentation = buildRecordSubmitFeedbackPresentation(result, '跳过周期任务失败');
      if (presentation.message) showNotice(presentation.message, presentation.tone);
      if (result.status === 'success' || result.status === 'partial_success') closeModal();
    } catch (error: unknown) {
      showNotice(error instanceof Error ? error.message : '跳过周期任务失败');
    } finally {
      setIsSkippingRecurringTask(false);
    }
  }, [closeModal, editItem?.id, isSkippingRecurringTask, showNotice, useCases]);
  const handleStopSeries = useCallback(async () => {
    const seriesId = String(editItem?.seriesId || '').trim();
    if (!seriesId || isStoppingSeries) return;
    if (!window.confirm('确认停止这个周期任务吗？当前这次任务会保留，但以后不再自动生成下一次。')) return;
    setIsStoppingSeries(true);
    try {
      await useCases.recordInput.stopTaskSeries(seriesId);
      showNotice('已停止重复；当前任务仍保留。', 'success');
      closeModal();
    } catch (error: unknown) {
      showNotice(error instanceof Error ? error.message : '停止周期任务失败');
    } finally {
      setIsStoppingSeries(false);
    }
  }, [closeModal, editItem?.seriesId, isStoppingSeries, showNotice, useCases]);
  const handleTaskLifecycleCommand = useCallback(async (command: TaskLifecycleCommand) => {
    const itemId = String(editItem?.id || '').trim();
    if (!itemId || isChangingTaskLifecycle) return;
    const labels: Partial<Record<TaskLifecycleCommand, string>> = {
      complete: '确认完成这个任务吗？',
      cancel: '确认取消这个任务吗？',
      reopen: '确认重新打开这个任务吗？',
    };
    if (labels[command] && !window.confirm(labels[command]!)) return;
    setIsChangingTaskLifecycle(true);
    try {
      const result = await useCases.taskRuntime.runLifecycle({ taskId: itemId, command, source: 'quickinput' });
      const presentation = buildRecordSubmitFeedbackPresentation(result, '任务状态修改失败');
      if (presentation.message) showNotice(presentation.message, presentation.tone);
      if (result.status === 'success') closeModal();
    } catch (error: unknown) {
      showNotice(error instanceof Error ? error.message : '任务状态修改失败');
    } finally {
      setIsChangingTaskLifecycle(false);
    }
  }, [closeModal, editItem?.id, isChangingTaskLifecycle, showNotice, useCases]);
  const handleEnergyCapture = useCallback(async (request: QuickInputEnergyCaptureRequest) => {
    const now = dayjs();
    const isRetrospective = request.captureMode === 'retrospective';
    const common = {
      goalPath: request.goalPath,
      date: isRetrospective ? request.date : now.format('YYYY-MM-DD'),
      time: isRetrospective ? request.time : now.format('HH:mm'),
      captureMode: request.captureMode,
      timePrecision: 'exact' as const,
      recordedAt: isRetrospective ? now.format('YYYY-MM-DD HH:mm') : undefined,
      source: 'desktop-panel',
    };
    const result = request.scoreMode === 'detailed'
      ? await useCases.recordInput.submitEnergySnapshot({
          ...common,
          scoreMode: 'detailed',
          brainScore: request.brainScore,
          physicalScore: request.physicalScore,
        })
      : await useCases.recordInput.submitEnergySnapshot({
          ...common,
          scoreMode: 'quick',
          score: request.score,
        });
    const presentation = buildRecordSubmitFeedbackPresentation(result, '精力记录失败');
    if (presentation.message) showNotice(presentation.message, presentation.tone);
    if (presentation.shouldCloseModal) closeModal();
  }, [closeModal, showNotice, useCases]);
  const handleRecoveryRescan = useCallback(async () => {
    if (!recovery.paths.length || isRescanningRecoveryPaths) return;
    setIsRescanningRecoveryPaths(true);
    try {
      await Promise.all(recovery.paths.map((path) => dataStore.scanFileByPath(path)));
      showNotice(`已重新扫描 ${recovery.paths.length} 个文件，请重试保存。`, 'success');
    } catch (error: unknown) {
      showNotice(error instanceof Error ? error.message : '重新扫描失败');
    } finally {
      setIsRescanningRecoveryPaths(false);
    }
  }, [dataStore, isRescanningRecoveryPaths, recovery.paths, showNotice]);
  return (
    <div class="think-modal think-modal--quick-input">
      <QuickInputModalHeader
        operationMode={operationMode}
        currentRecordTypeName={currentRecordTypeName}
        isTimerCreate={isTimerCreate}
        originalGestureHint={originalGestureHint}
        onClose={closeModal}
        onOperationModeChange={handleOperationModeChange}
        onOriginalPointerClick={handleOriginalPointerClick}
        onOriginalTouchEnd={handleOriginalTouchEnd}
      />
      {!isEnergyDirect && <QuickInputConflictRecoveryPanel
        recovery={recovery}
        isBusy={isBusy}
        isRescanning={isRescanningRecoveryPaths}
        onOpenOriginal={openOriginal}
        onRescan={handleRecoveryRescan}
        onRetry={handleSubmit}
        onDismiss={clearRecovery}
      />}
      <div class="think-modal__body">
        <QuickInputEditor
          key={`${editorResetVersion}:${editItem?.id ?? 'create'}`}
          getResourcePath={getResourcePath}
          initialRecordTypeId={preparedRecord.recordTypeId || initialRecordTypeId}
          initialFormData={preparedRecord.initialFormData}
          context={mode === 'edit' ? undefined : context}
          recordInputMode={editorSessionMode}
          allowRecordTypeSwitch={operationMode === 'convert' || operationMode === 'duplicate' ? true : (mode === 'edit' ? false : allowRecordTypeSwitch)}
          onStateChange={handleEditorStateChange}
          onRequestSubmit={handleSubmit}
          onEnergyCapture={handleEnergyCapture}
          isMobileLike={isMobileLike}
          autoFocusContent={mode === 'create'}
        />
        {operationMode === 'edit' && editItem?.recordType === 'task' && normalizeTaskStatus(editItem.status) ? (
          <TaskLifecycleEditor
            status={normalizeTaskStatus(editItem.status)!}
            recurring={Boolean(String(editItem.seriesId || '').trim())}
            busy={isChangingTaskLifecycle}
            onCommand={handleTaskLifecycleCommand}
          />
        ) : null}
        {isRecurringTaskEdit ? (
          <RecurringTaskSeriesEditor
            recurrence={taskSeriesRecurrence}
            onRecurrenceChange={setTaskSeriesRecurrence}
            onSkipCurrent={handleSkipRecurringTask}
            onStopSeries={handleStopSeries}
            skipping={isSkippingRecurringTask}
            stopping={isStoppingSeries}
          />
        ) : null}
      </div>
      {!isEnergyDirect && <QuickInputModalFooter
        operationMode={operationMode}
        isBusy={isBusy}
        canSubmit={canSubmit}
        isMobileLike={isMobileLike}
        pendingAction={pendingAction}
        onCancel={closeModal}
        onDelete={handleDelete}
        onSubmitClick={handleSubmit}
        onSubmitPointerDown={handleSubmitPointerDown}
        onPreserveDesktopInputFocus={preserveDesktopInputFocus}
        allowDelete={!isRecurringTaskEdit}
      />}
    </div>
  );
}
