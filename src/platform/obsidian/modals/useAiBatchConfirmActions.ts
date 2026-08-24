import { Notice } from 'obsidian';
import { useEffect, useRef, useState } from 'preact/hooks';

import type { QuickInputEditorState } from '@/app/public';
import type { RecordSubmitResult, SubmitCreateRecordParams } from '@core/recordInput/public';
import { buildRecordSubmitFeedbackPresentation } from '@core/utils/public';

import {
  type AiBatchConfirmRecordItem,
  buildAiBatchConfirmBatchSummary,
  buildAiBatchConfirmCreateSubmitParams,
  findNextPendingAiBatchConfirmIndex,
  materializeAiBatchConfirmRecordDraft,
  summarizeAiBatchConfirmRecords,
} from './AiBatchConfirmModel';
import { logAiBatchSubmit, showAiBatchSaveFailure, showAiBatchUnexpectedSaveError } from './AiBatchConfirmSubmitFeedback';

export type AiBatchConfirmPendingAction = 'current' | 'all' | null;

export interface AiBatchConfirmActionStatus {
  tone: 'idle' | 'working' | 'success' | 'error';
  message: string;
}

export interface UseAiBatchConfirmActionsInput {
  initialRecords: AiBatchConfirmRecordItem[];
  traceId?: string;
  submitCreateRecord: (params: SubmitCreateRecordParams) => Promise<RecordSubmitResult>;
  closeModal: () => void;
  onComplete?: () => void;
}

interface AiBatchConfirmViewState {
  records: AiBatchConfirmRecordItem[];
  currentIndex: number;
}

function replaceRecordAtIndex(
  records: AiBatchConfirmRecordItem[],
  index: number,
  record: AiBatchConfirmRecordItem,
): AiBatchConfirmRecordItem[] {
  return records.map((entry, currentIndex) => currentIndex === index ? record : entry);
}

export function useAiBatchConfirmActions({
  initialRecords,
  traceId,
  submitCreateRecord,
  closeModal,
  onComplete,
}: UseAiBatchConfirmActionsInput) {
  const [viewState, setViewState] = useState<AiBatchConfirmViewState>({ records: initialRecords, currentIndex: 0 });
  const recordsRef = useRef<AiBatchConfirmRecordItem[]>(initialRecords);
  const currentIndexRef = useRef(0);
  const draftStateByRecordIdRef = useRef<Map<string, QuickInputEditorState>>(new Map());
  const [pendingAction, setPendingAction] = useState<AiBatchConfirmPendingAction>(null);
  const pendingActionRef = useRef<AiBatchConfirmPendingAction>(null);
  const [actionStatus, setActionStatus] = useState<AiBatchConfirmActionStatus>({ tone: 'idle', message: '' });
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeAbortControllerRef.current?.abort();
      activeAbortControllerRef.current = null;
    };
  }, []);

  const publishView = (nextRecords: AiBatchConfirmRecordItem[], nextIndex: number): AiBatchConfirmRecordItem[] => {
    recordsRef.current = nextRecords;
    currentIndexRef.current = nextIndex;
    if (mountedRef.current) setViewState({ records: nextRecords, currentIndex: nextIndex });
    return nextRecords;
  };

  const materializeRecord = (record: AiBatchConfirmRecordItem): AiBatchConfirmRecordItem => {
    return materializeAiBatchConfirmRecordDraft(record, draftStateByRecordIdRef.current.get(record.id));
  };

  const materializeDraftIntoRecords = (
    records: AiBatchConfirmRecordItem[],
    index: number,
  ): AiBatchConfirmRecordItem[] => {
    const record = records[index];
    if (!record) return records;
    const materialized = materializeRecord(record);
    return materialized === record ? records : replaceRecordAtIndex(records, index, materialized);
  };

  const chooseNextPendingIndex = (records: AiBatchConfirmRecordItem[], fromIndex: number): number => {
    const nextPending = findNextPendingAiBatchConfirmIndex(records, fromIndex);
    return nextPending >= 0 ? nextPending : fromIndex;
  };

  const setCurrentIndex = (index: number) => {
    if (pendingActionRef.current) return;
    if (index < 0 || index >= recordsRef.current.length) return;
    if (index === currentIndexRef.current) return;

    const nextRecords = materializeDraftIntoRecords(recordsRef.current, currentIndexRef.current);
    publishView(nextRecords, index);
  };

  const beginPendingAction = (action: Exclude<AiBatchConfirmPendingAction, null>, message: string): boolean => {
    if (pendingActionRef.current) return false;
    pendingActionRef.current = action;
    setPendingAction(action);
    setActionStatus({ tone: 'working', message });
    return true;
  };

  const endPendingAction = () => {
    pendingActionRef.current = null;
    if (mountedRef.current) setPendingAction(null);
  };

  const handleEditorStateChange = (recordId: string, state: QuickInputEditorState) => {
    // Ref-only by design: feeding draft state back into initialBlockId/context would reset the editor.
    draftStateByRecordIdRef.current.set(recordId, state);
  };

  const handleSaveCurrent = async () => {
    const indexToSave = currentIndexRef.current;
    const current = recordsRef.current[indexToSave];
    logAiBatchSubmit(traceId, 'ui action: save current', {
      index: indexToSave,
      recordId: current?.id || null,
      blockedByPendingAction: pendingActionRef.current,
    });
    if (!current || !beginPendingAction('current', `正在保存第 ${indexToSave + 1} 条…`)) return;

    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;

    try {
      const recordToSave = materializeRecord(current);
      logAiBatchSubmit(traceId, 'before submitCreateRecord', {
        mode: 'single',
        index: indexToSave,
        blockId: recordToSave.blockId,
      });
      const result = await submitCreateRecord(buildAiBatchConfirmCreateSubmitParams(recordToSave, abortController.signal));
      if (!mountedRef.current) return;
      logAiBatchSubmit(traceId, 'after submitCreateRecord', {
        mode: 'single',
        index: indexToSave,
        status: result.status,
        hasAffectedRecordId: !!result.affectedRecordId,
      });

      if (result.status === 'success' || result.status === 'partial_success') {
        const nextRecords = replaceRecordAtIndex(recordsRef.current, indexToSave, {
          ...recordToSave,
          saved: true,
          skipped: false,
        });
        const nextIndex = chooseNextPendingIndex(nextRecords, indexToSave);
        publishView(nextRecords, nextIndex);

        const presentation = buildRecordSubmitFeedbackPresentation(result, '保存失败');
        setActionStatus({
          tone: 'success',
          message: result.status === 'partial_success'
            ? `第 ${indexToSave + 1} 条已保存，但有提示：${presentation.message}`
            : `第 ${indexToSave + 1} 条已保存`,
        });
        new Notice(result.status === 'partial_success'
          ? `⚠️ 第 ${indexToSave + 1} 条已保存：${presentation.message}`
          : `✅ 第 ${indexToSave + 1} 条已保存`);
        return;
      }

      const presentation = buildRecordSubmitFeedbackPresentation(result, '保存失败');
      setActionStatus({ tone: 'error', message: presentation.message || '保存失败' });
      showAiBatchSaveFailure(result, indexToSave);
    } catch (error: unknown) {
      if (!mountedRef.current) return;
      const message = error instanceof Error ? error.message : String(error);
      setActionStatus({ tone: 'error', message: `保存失败：${message}` });
      showAiBatchUnexpectedSaveError(traceId, 'single', error);
    } finally {
      if (activeAbortControllerRef.current === abortController) activeAbortControllerRef.current = null;
      endPendingAction();
    }
  };

  const handleSkipCurrent = () => {
    const indexToSkip = currentIndexRef.current;
    const current = recordsRef.current[indexToSkip];
    logAiBatchSubmit(traceId, 'ui action: skip current', {
      index: indexToSkip,
      recordId: current?.id || null,
      blockedByPendingAction: pendingActionRef.current,
    });
    if (!current || pendingActionRef.current) return;

    const materialized = materializeRecord(current);
    const nextRecords = replaceRecordAtIndex(recordsRef.current, indexToSkip, {
      ...materialized,
      skipped: true,
    });
    const nextIndex = chooseNextPendingIndex(nextRecords, indexToSkip);
    publishView(nextRecords, nextIndex);
    setActionStatus({ tone: 'idle', message: `已跳过第 ${indexToSkip + 1} 条` });
  };

  const handleSaveAll = async () => {
    logAiBatchSubmit(traceId, 'ui action: save all', {
      pendingCount: summarizeAiBatchConfirmRecords(recordsRef.current).pendingCount,
      blockedByPendingAction: pendingActionRef.current,
    });
    if (!beginPendingAction('all', '正在保存全部待处理记录…')) return;

    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;
    const results: RecordSubmitResult[] = [];
    let workingRecords = recordsRef.current.map((record) => materializeRecord(record));
    const pendingIndexes = workingRecords
      .map((record, index) => ({ record, index }))
      .filter(({ record }) => !record.saved && !record.skipped)
      .map(({ index }) => index);

    try {
      logAiBatchSubmit(traceId, 'before batch submitCreateRecord', {
        pendingCount: pendingIndexes.length,
      });

      for (let position = 0; position < pendingIndexes.length; position += 1) {
        const index = pendingIndexes[position];
        const recordToSave = workingRecords[index];
        setActionStatus({
          tone: 'working',
          message: `正在保存 ${position + 1}/${pendingIndexes.length}：第 ${index + 1} 条…`,
        });

        const result = await submitCreateRecord(buildAiBatchConfirmCreateSubmitParams(recordToSave, abortController.signal));
        if (!mountedRef.current) return;
        results.push(result);
        logAiBatchSubmit(traceId, 'batch submitCreateRecord item', {
          index,
          blockId: recordToSave.blockId,
          status: result.status,
          hasAffectedRecordId: !!result.affectedRecordId,
        });

        if (result.status === 'success' || result.status === 'partial_success') {
          workingRecords[index] = { ...recordToSave, saved: true, skipped: false };
        } else {
          showAiBatchSaveFailure(result, index);
        }

        // Progress updates never switch the mounted editor to another record.
        publishView([...workingRecords], currentIndexRef.current);
      }

      const batchSummary = buildAiBatchConfirmBatchSummary(results);
      logAiBatchSubmit(traceId, 'after batch submitCreateRecord', {
        status: batchSummary.status,
        submittedCount: results.length,
      });
      if (batchSummary.feedback?.notice) new Notice(batchSummary.feedback.notice);

      const latestSummary = summarizeAiBatchConfirmRecords(workingRecords);
      setActionStatus({
        tone: batchSummary.status === 'success' || batchSummary.status === 'partial_success' ? 'success' : 'error',
        message: `批量保存结束：已保存 ${latestSummary.savedCount} 条，待处理 ${latestSummary.pendingCount} 条`,
      });
    } catch (error: unknown) {
      if (!mountedRef.current) return;
      const message = error instanceof Error ? error.message : String(error);
      setActionStatus({ tone: 'error', message: `批量保存中断：${message}` });
      showAiBatchUnexpectedSaveError(traceId, 'batch', error);
    } finally {
      if (activeAbortControllerRef.current === abortController) activeAbortControllerRef.current = null;
      endPendingAction();
    }
  };

  const handleComplete = () => {
    logAiBatchSubmit(traceId, 'ui action: complete', {
      blockedByPendingAction: pendingActionRef.current,
    });
    if (pendingActionRef.current) return;

    const committedRecords = materializeDraftIntoRecords(recordsRef.current, currentIndexRef.current);
    recordsRef.current = committedRecords;
    const latestSummary = summarizeAiBatchConfirmRecords(committedRecords);
    new Notice(`完成：已保存 ${latestSummary.savedCount} 条，跳过 ${latestSummary.skippedCount} 条`);
    onComplete?.();
    closeModal();
  };

  const { records, currentIndex } = viewState;
  const summary = summarizeAiBatchConfirmRecords(records);
  const currentRecord = records[currentIndex] || null;

  return {
    records,
    currentIndex,
    currentRecord,
    summary,
    pendingAction,
    isBusy: pendingAction !== null,
    actionStatus,
    setCurrentIndex,
    handleEditorStateChange,
    handleSaveCurrent,
    handleSkipCurrent,
    handleSaveAll,
    handleComplete,
  };
}
