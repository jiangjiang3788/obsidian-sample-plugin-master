import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import type { UseCases } from '@/app/public';
import type { QuickInputEditorState } from '../editor';
import { buildRecordSubmitFeedbackPresentation } from '@core/utils/public';
import { buildRecordSubmitRecoveryPresentation, type RecordSubmitRecoveryPresentation } from '@core/utils/public';
import type { Item, QuickInputSaveData } from '@core/types/public';
import {
  assertRecordInputRequiredFields,
  buildCreateRecordSubmitParamsFromEditorState,
  buildRecordCreateDraftFromEditorState,
  buildUpdateRecordSubmitParamsFromEditorState,
  type RecordInputSource,
  type RecordOutputPlan,
  type RecordPersistencePlan,
  type RecordSubmitResult,
} from '@core/recordInput/public';
import { CancelledError, createTakeLatest } from '@shared/utils/public';

import type { ShowQuickInputNotice } from './quickInputNotice';
import type { QuickInputPendingAction } from './QuickInputModalFooter';
import type { QuickInputOperationMode } from './quickInputOperationMode';
import {
  getQuickInputFailureMessage,
  getQuickInputSuccessNotice,
  isQuickInputUpdateOperation,
} from './quickInputOperationMode';



export interface QuickInputSubmitControllerParams {
  operationMode: QuickInputOperationMode;
  editItem?: Item;
  context?: Record<string, any>;
  source?: Extract<RecordInputSource, 'quickinput' | 'view_quick_create' | 'timer' | 'unknown'>;
  onSave?: (data: QuickInputSaveData) => void;
  onSubmitSuccess?: (result: RecordSubmitResult, draft: QuickInputSaveData) => void | Promise<void>;
  closeModal: () => void;
  useCases: UseCases;
  getCurrentState: () => QuickInputEditorState;
  liveOutputPlan: RecordOutputPlan | null;
  livePersistencePlan: RecordPersistencePlan | null;
  isMobileLike: boolean;
  showNotice: ShowQuickInputNotice;
}

export interface QuickInputSubmitController {
  pendingAction: QuickInputPendingAction;
  isBusy: boolean;
  handleSubmit: () => Promise<void>;
  handleDelete: () => Promise<void>;
  handleSubmitPointerDown: (event: MouseEvent | PointerEvent) => void;
  preserveDesktopInputFocus: (event: MouseEvent | PointerEvent) => void;
  recovery: RecordSubmitRecoveryPresentation;
  clearRecovery: () => void;
}

function withOperationSuccessNotice(
  result: RecordSubmitResult,
  operationMode: QuickInputOperationMode,
): RecordSubmitResult {
  if (result.status !== 'success') return result;
  const notice = getQuickInputSuccessNotice(operationMode, result.feedback?.notice);
  if (!notice) return result;
  return {
    ...result,
    feedback: {
      ...(result.feedback || {}),
      notice,
    },
  };
}

function confirmConvertOperation(operationMode: QuickInputOperationMode): boolean {
  if (operationMode !== 'convert') return true;
  return window.confirm('确认转换这条记录的记录类型吗？转换会按当前记录类型模板改写原记录；若保存位置变化，会先写入新位置再删除旧记录。');
}

export function useQuickInputSubmitController({
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
}: QuickInputSubmitControllerParams): QuickInputSubmitController {
  const [pendingAction, setPendingAction] = useState<QuickInputPendingAction>(null);
  const [lastConflictResult, setLastConflictResult] = useState<RecordSubmitResult | null>(null);
  const pendingActionRef = useRef<QuickInputPendingAction>(null);
  const submitTriggeredRef = useRef(false);
  const submitLatestRef = useRef(createTakeLatest('quick-input-submit'));

  useEffect(() => {
    pendingActionRef.current = pendingAction;
  }, [pendingAction]);

  useEffect(() => () => submitLatestRef.current.dispose(), []);

  const buildCreateDraft = useCallback((): QuickInputSaveData => buildRecordCreateDraftFromEditorState({
    state: getCurrentState(),
    context,
    source: source ?? (onSave ? 'timer' : 'quickinput'),
  }), [context, getCurrentState, onSave, source]);

  const clearRecovery = useCallback(() => {
    setLastConflictResult(null);
  }, []);

  const rememberConflict = useCallback((result: RecordSubmitResult) => {
    if (result.status === 'conflict') {
      setLastConflictResult(result);
    } else if (result.status === 'success' || result.status === 'partial_success') {
      setLastConflictResult(null);
    }
  }, []);

  const resetSubmitGateSoon = useCallback(() => {
    window.setTimeout(() => {
      submitTriggeredRef.current = false;
    }, 80);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitTriggeredRef.current || pendingActionRef.current) return;
    if (!confirmConvertOperation(operationMode)) return;
    submitTriggeredRef.current = true;

    if (onSave && operationMode === 'create') {
      try {
        onSave(buildCreateDraft());
        closeModal();
      } finally {
        resetSubmitGateSoon();
      }
      return;
    }

    setLastConflictResult(null);
    pendingActionRef.current = 'submit';
    setPendingAction('submit');
    try {
      const result = await submitLatestRef.current.run(async (signal) => {
        const latestState = getCurrentState();
        assertRecordInputRequiredFields(latestState);
        if (isQuickInputUpdateOperation(operationMode) && editItem) {
          return await useCases.recordInput.submitUpdateRecord(buildUpdateRecordSubmitParamsFromEditorState({
            state: latestState,
            item: editItem,
            expectedOutputPlan: liveOutputPlan,
            expectedPersistencePlan: livePersistencePlan,
            signal,
            source: 'quickinput',
          }));
        }

        return await useCases.recordInput.submitCreateRecord(buildCreateRecordSubmitParamsFromEditorState({
          state: latestState,
          context: operationMode === 'duplicate' ? undefined : context,
          signal,
          source: source ?? 'quickinput',
        }));
      });

      const feedbackResult = withOperationSuccessNotice(result, operationMode);
      rememberConflict(feedbackResult);

      const presentation = buildRecordSubmitFeedbackPresentation(
        feedbackResult,
        getQuickInputFailureMessage(operationMode),
      );

      if (feedbackResult.status === 'cancelled') {
        return;
      }

      if (presentation.message) {
        const shouldShowOwnSuccessNotice = !(operationMode === 'create' && source === 'timer' && onSubmitSuccess);
        if (presentation.tone !== 'success' || shouldShowOwnSuccessNotice) {
          showNotice(presentation.message, presentation.tone);
        }
      }

      if (feedbackResult.status === 'success' && operationMode === 'create' && onSubmitSuccess) {
        try {
          await onSubmitSuccess(feedbackResult, buildCreateDraft());
        } catch (followUpError: unknown) {
          showNotice(followUpError instanceof Error ? followUpError.message : '记录已创建，但后续操作失败');
        }
      }

      if (presentation.shouldCloseModal) {
        closeModal();
      }
    } catch (error: any) {
      if (!(error instanceof CancelledError)) {
        showNotice(error?.message || getQuickInputFailureMessage(operationMode));
      }
    } finally {
      pendingActionRef.current = null;
      setPendingAction(null);
      resetSubmitGateSoon();
    }
  }, [
    buildCreateDraft,
    closeModal,
    context,
    editItem,
    getCurrentState,
    liveOutputPlan,
    livePersistencePlan,
    operationMode,
    onSave,
    onSubmitSuccess,
    rememberConflict,
    resetSubmitGateSoon,
    source,
    useCases,
  ]);

  const handleDelete = useCallback(async () => {
    if (pendingActionRef.current) return;
    if (!isQuickInputUpdateOperation(operationMode) || !editItem) return;
    if (!window.confirm('确认删除这条记录吗？')) return;

    setLastConflictResult(null);
    pendingActionRef.current = 'delete';
    setPendingAction('delete');
    try {
      const result = await submitLatestRef.current.run((signal) => useCases.recordInput.submitDeleteRecord({
        item: editItem,
        signal,
        source: 'quickinput',
      }));

      rememberConflict(result);

      const presentation = buildRecordSubmitFeedbackPresentation(result, '删除失败');
      if (result.status === 'cancelled') {
        return;
      }

      if (presentation.message) {
        showNotice(presentation.message, presentation.tone);
      }

      if (presentation.shouldCloseModal) {
        closeModal();
      }
    } catch (error: any) {
      if (!(error instanceof CancelledError)) {
        showNotice(error?.message || '删除失败');
      }
    } finally {
      pendingActionRef.current = null;
      setPendingAction(null);
    }
  }, [closeModal, editItem, operationMode, rememberConflict, useCases]);

  const preserveDesktopInputFocus = useCallback((event: MouseEvent | PointerEvent) => {
    if (isMobileLike) return;
    event.preventDefault();
  }, [isMobileLike]);

  const handleSubmitPointerDown = useCallback((event: MouseEvent | PointerEvent) => {
    if (isMobileLike) return;
    event.preventDefault();
    event.stopPropagation();
    void handleSubmit();
  }, [handleSubmit, isMobileLike]);

  const recovery = buildRecordSubmitRecoveryPresentation(lastConflictResult, {
    fallbackPath: editItem?.file?.path ?? null,
    canOpenOriginal: operationMode !== 'create' && Boolean(editItem),
  });

  return {
    pendingAction,
    isBusy: pendingAction !== null,
    handleSubmit,
    handleDelete,
    handleSubmitPointerDown,
    preserveDesktopInputFocus,
    recovery,
    clearRecovery,
  };
}
