/** @jsxImportSource preact */
import { h } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';

import {
  selectInputSettings,
  useDataStore,
  useSelector,
  useUseCases,
} from '@/app/public';
import type { Item, QuickInputSaveData } from '@core/types/public';
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

export interface QuickInputModalContentProps {
  getResourcePath: (path: string) => string;
  initialBlockId: string;
  context?: Record<string, unknown>;
  initialThemeId?: string;
  onSave?: (data: QuickInputSaveData) => void;
  closeModal: () => void;
  allowBlockSwitch: boolean;
  mode: 'create' | 'edit';
  editItem?: Item;
  source?: Extract<RecordInputSource, 'quickinput' | 'view_quick_create' | 'timer' | 'unknown'>;
  vaultName: string;
  onSubmitSuccess?: (result: RecordSubmitResult, draft: QuickInputSaveData) => void | Promise<void>;
  showNotice: ShowQuickInputNotice;
}

export function QuickInputModalContent({
  getResourcePath,
  initialBlockId,
  context,
  initialThemeId,
  onSave,
  closeModal,
  allowBlockSwitch,
  mode,
  editItem,
  source,
  vaultName,
  onSubmitSuccess,
  showNotice,
}: QuickInputModalContentProps) {
  const settings = useSelector(selectInputSettings);
  const useCases = useUseCases();
  const dataStore = useDataStore();

  const preparedRecord = useMemo(() => {
    if (mode === 'edit' && editItem) {
      return useCases.recordInput.prepareEditRecord({
        item: editItem,
        blockId: initialBlockId,
        themeId: initialThemeId ?? null,
        source: 'quickinput',
      });
    }

    return useCases.recordInput.prepareCreateRecord({
      blockId: initialBlockId,
      themeId: initialThemeId ?? null,
      context,
      source: onSave ? 'timer' : (source ?? 'quickinput'),
    });
  }, [useCases, initialBlockId, initialThemeId, context, mode, editItem, onSave, source]);

  const [isRescanningRecoveryPaths, setIsRescanningRecoveryPaths] = useState(false);
  const [editOperationMode, setEditOperationMode] = useState<Extract<QuickInputOperationMode, 'edit' | 'convert' | 'duplicate'>>('edit');
  const [editorResetVersion, setEditorResetVersion] = useState(0);
  const operationMode: QuickInputOperationMode = mode === 'create' ? 'create' : editOperationMode;
  const editorSessionMode = operationMode;
  const outputPlanMode: 'create' | 'edit' = operationMode === 'duplicate' ? 'create' : mode;
  const [editorState, setEditorState] = useState<QuickInputEditorState>({
    blockId: preparedRecord.blockId || initialBlockId,
    themeId: preparedRecord.themeId,
    formData: preparedRecord.initialFormData,
    meta: { timeDirection: 'forward' },
    template: null,
    theme: null,
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
    setEditorResetVersion((version) => version + 1);
  }, [editIdentity]);

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
  const currentBlock = (settings.blocks || []).find((block: { id: string }) => block.id === currentState.blockId);
  const currentBlockName = currentBlock?.name || currentState.template?.name || currentState.blockId;
  const isTimerCreate = mode === 'create' && (source === 'timer' || !!onSave);
  const {
    liveOutputPlan,
    livePersistencePlan,
  } = useQuickInputOutputPlan({ currentState, preparedRecord, editItem, mode: outputPlanMode });

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
  });

  const handleEditorStateChange = useCallback((state: QuickInputEditorState) => {
    editorStateRef.current = state;
    setEditorState(state);
  }, []);

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
        currentBlockName={currentBlockName}
        isTimerCreate={isTimerCreate}
        originalGestureHint={originalGestureHint}
        onClose={closeModal}
        onOperationModeChange={handleOperationModeChange}
        onOriginalPointerClick={handleOriginalPointerClick}
        onOriginalTouchEnd={handleOriginalTouchEnd}
      />

      <QuickInputConflictRecoveryPanel
        recovery={recovery}
        isBusy={isBusy}
        isRescanning={isRescanningRecoveryPaths}
        onOpenOriginal={openOriginal}
        onRescan={handleRecoveryRescan}
        onRetry={handleSubmit}
        onDismiss={clearRecovery}
      />

      <div class="think-modal__body">
        <QuickInputEditor
          key={`${editorResetVersion}:${editItem?.id ?? 'create'}`}
          getResourcePath={getResourcePath}
          initialBlockId={preparedRecord.blockId || initialBlockId}
          initialThemeId={preparedRecord.themeId}
          initialFormData={preparedRecord.initialFormData}
          context={mode === 'edit' ? undefined : context}
          recordInputMode={editorSessionMode}
          allowBlockSwitch={operationMode === 'convert' || operationMode === 'duplicate' ? true : (mode === 'edit' ? false : allowBlockSwitch)}
          onStateChange={handleEditorStateChange}
          onRequestSubmit={handleSubmit}
          isMobileLike={isMobileLike}
        />
      </div>

      <QuickInputModalFooter
        operationMode={operationMode}
        isBusy={isBusy}
        isMobileLike={isMobileLike}
        pendingAction={pendingAction}
        onCancel={closeModal}
        onDelete={handleDelete}
        onSubmitClick={handleSubmit}
        onSubmitPointerDown={handleSubmitPointerDown}
        onPreserveDesktopInputFocus={preserveDesktopInputFocus}
      />
    </div>
  );
}
