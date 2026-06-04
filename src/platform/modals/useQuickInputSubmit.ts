import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import type { QuickInputEditorState, UseCases } from '@/app/public';
import {
  buildRecordSubmitFeedbackPresentation,
  buildRecordSubmitRecoveryPresentation,
  type Item,
  type QuickInputSaveData,
  type RecordInputSource,
  type RecordOutputPlan,
  type RecordPersistencePlan,
  type RecordSubmitRecoveryPresentation,
  type RecordSubmitResult,
} from '@core/public';
import { CancelledError, createTakeLatest } from '@shared/public';

import { showQuickInputNotice } from './quickInputNotice';
import type { QuickInputPendingAction } from './QuickInputModalFooter';

export interface QuickInputSubmitControllerParams {
  mode: 'create' | 'edit';
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

export function useQuickInputSubmitController({
  mode,
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

  const buildCreateDraft = useCallback((): QuickInputSaveData => {
    const currentState = getCurrentState();
    return {
      blockId: currentState.blockId,
      themeId: currentState.themeId ?? null,
      formData: currentState.formData,
      context,
      meta: currentState.meta,
      source: source ?? (onSave ? 'timer' : 'quickinput'),
    };
  }, [context, getCurrentState, onSave, source]);

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
    submitTriggeredRef.current = true;

    if (onSave && mode === 'create') {
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
        if (mode === 'edit' && editItem) {
          return await useCases.recordInput.submitUpdateRecord({
            item: editItem,
            blockId: latestState.blockId,
            themeId: latestState.themeId,
            formData: latestState.formData,
            meta: latestState.meta,
            expectedOutputPlan: liveOutputPlan,
            expectedPersistencePlan: livePersistencePlan,
            signal,
            source: 'quickinput',
          });
        }

        return await useCases.recordInput.submitCreateRecord({
          blockId: latestState.blockId,
          themeId: latestState.themeId,
          formData: latestState.formData,
          context,
          meta: latestState.meta,
          signal,
          source: source ?? 'quickinput',
        });
      });

      rememberConflict(result);

      const presentation = buildRecordSubmitFeedbackPresentation(
        result,
        mode === 'edit' ? '保存修改失败' : '创建失败',
      );

      if (result.status === 'cancelled') {
        return;
      }

      if (presentation.message) {
        const shouldShowOwnSuccessNotice = !(mode === 'create' && source === 'timer' && onSubmitSuccess);
        if (presentation.tone !== 'success' || shouldShowOwnSuccessNotice) {
          showQuickInputNotice(presentation.message, presentation.tone);
        }
      }

      if (result.status === 'success' && mode === 'create' && onSubmitSuccess) {
        try {
          await onSubmitSuccess(result, buildCreateDraft());
        } catch (followUpError: unknown) {
          showQuickInputNotice(followUpError instanceof Error ? followUpError.message : '记录已创建，但后续操作失败');
        }
      }

      if (presentation.shouldCloseModal) {
        closeModal();
      }
    } catch (error: any) {
      if (!(error instanceof CancelledError)) {
        showQuickInputNotice(error?.message || (mode === 'edit' ? '保存修改失败' : '创建失败'));
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
    mode,
    onSave,
    onSubmitSuccess,
    rememberConflict,
    resetSubmitGateSoon,
    source,
    useCases,
  ]);

  const handleDelete = useCallback(async () => {
    if (pendingActionRef.current) return;
    if (mode !== 'edit' || !editItem) return;
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
        showQuickInputNotice(presentation.message, presentation.tone);
      }

      if (presentation.shouldCloseModal) {
        closeModal();
      }
    } catch (error: any) {
      if (!(error instanceof CancelledError)) {
        showQuickInputNotice(error?.message || '删除失败');
      }
    } finally {
      pendingActionRef.current = null;
      setPendingAction(null);
    }
  }, [closeModal, editItem, mode, rememberConflict, useCases]);

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
    canOpenOriginal: mode === 'edit' && Boolean(editItem),
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
