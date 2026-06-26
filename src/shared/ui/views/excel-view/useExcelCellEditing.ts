import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { ExcelCellBatchEdit, ExcelCellCommitReason, ExcelCellEditingState, ExcelCellModel, UseExcelCellEditingOptions } from './types';
import { canInlineEditExcelCell, getExcelCellKey } from './types';
import {
  addExcelSetValue,
  addExcelSetValues,
  buildExcelCellCommitPlan,
  buildExcelCellValidationErrors,
  buildExcelFillDragBatchEdits,
  buildExcelSingleCellEditPlan,
  clearExcelCellErrors,
  getExcelCellCommitExceptionMessage,
  getExcelCellCommitFailureMessage,
  getExcelCellNoCommitHandlerMessage,
  getExcelCellReadonlyMessage,
  getExcelCommittedValue,
  removeExcelSetValue,
  removeExcelSetValues,
  shouldSkipExcelCommit,
} from './ExcelCellEditingModel';

export function useExcelCellEditing(options: UseExcelCellEditingOptions): ExcelCellEditingState {
  const { onCellCommit } = options;
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);
  const [editingCellKey, setEditingCellKey] = useState<string | null>(null);
  const [pendingCellKeys, setPendingCellKeys] = useState<ReadonlySet<string>>(() => new Set());
  const [cellErrors, setCellErrors] = useState<Record<string, string | undefined>>({});
  const [valueOverrides, setValueOverrides] = useState<Record<string, unknown>>({});
  const [savedCellKeys, setSavedCellKeys] = useState<ReadonlySet<string>>(() => new Set());
  const saveFlashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const commitQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [fillDragSourceCell, setFillDragSourceCell] = useState<ExcelCellModel | null>(null);
  const [fillDragTargetCellKey, setFillDragTargetCellKey] = useState<string | null>(null);

  useEffect(() => () => {
    for (const timer of Object.values(saveFlashTimers.current)) clearTimeout(timer);
    saveFlashTimers.current = {};
  }, []);

  const enqueueCommitTask = useCallback(async (task: () => Promise<void>) => {
    const run = commitQueueRef.current.then(task, task);
    commitQueueRef.current = run.catch(() => undefined);
    await run;
  }, []);

  const flashSavedKey = useCallback((key: string) => {
    const existing = saveFlashTimers.current[key];
    if (existing) clearTimeout(existing);
    setSavedCellKeys(prev => addExcelSetValue(prev, key));
    saveFlashTimers.current[key] = setTimeout(() => {
      setSavedCellKeys(prev => removeExcelSetValue(prev, key));
      delete saveFlashTimers.current[key];
    }, 1200);
  }, []);

  const selectCell = useCallback((cell: ExcelCellModel) => {
    setSelectedCellKey(getExcelCellKey(cell.itemId, cell.canonicalField));
  }, []);

  const startEdit = useCallback((cell: ExcelCellModel) => {
    const key = getExcelCellKey(cell.itemId, cell.canonicalField);
    setSelectedCellKey(key);
    if (!onCellCommit) {
      setCellErrors(prev => ({ ...prev, [key]: getExcelCellNoCommitHandlerMessage() }));
      return;
    }
    if (!canInlineEditExcelCell(cell)) {
      setCellErrors(prev => ({ ...prev, [key]: getExcelCellReadonlyMessage(cell) }));
      return;
    }
    setEditingCellKey(key);
    setCellErrors(prev => ({ ...prev, [key]: undefined }));
  }, [onCellCommit]);

  const cancelEdit = useCallback(() => {
    setEditingCellKey(null);
  }, []);

  const commitCellValue = useCallback(async (
    cell: ExcelCellModel,
    nextValue: unknown,
    reason: ExcelCellCommitReason,
  ): Promise<boolean> => {
    const key = getExcelCellKey(cell.itemId, cell.canonicalField);

    if (!onCellCommit) {
      setCellErrors(prev => ({ ...prev, [key]: getExcelCellNoCommitHandlerMessage() }));
      return false;
    }

    if (!canInlineEditExcelCell(cell)) {
      setCellErrors(prev => ({ ...prev, [key]: getExcelCellReadonlyMessage(cell) }));
      return false;
    }

    if (shouldSkipExcelCommit(cell, nextValue)) return true;

    try {
      const result = await onCellCommit({
        item: cell.item,
        itemId: cell.itemId,
        field: cell.field,
        canonicalField: cell.canonicalField,
        oldValue: cell.value,
        nextValue,
        reason,
      });

      if (!result?.ok) {
        setCellErrors(prev => ({ ...prev, [key]: getExcelCellCommitFailureMessage(result?.message) }));
        return false;
      }

      setValueOverrides(prev => ({ ...prev, [key]: getExcelCommittedValue(nextValue, result.normalizedValue) }));
      setCellErrors(prev => ({ ...prev, [key]: undefined }));
      flashSavedKey(key);
      return true;
    } catch (error) {
      setCellErrors(prev => ({ ...prev, [key]: getExcelCellCommitExceptionMessage(error) }));
      return false;
    }
  }, [flashSavedKey, onCellCommit]);

  const commitBatchEdits = useCallback(async (edits: ExcelCellBatchEdit[], reason: ExcelCellCommitReason) => {
    if (!edits.length) return;

    const plan = buildExcelCellCommitPlan(edits, reason);
    if (plan.invalid.length) {
      setCellErrors(prev => buildExcelCellValidationErrors(prev, plan.invalid));
    }
    if (!plan.valid.length) return;

    setEditingCellKey(null);
    setSelectedCellKey(plan.valid[plan.valid.length - 1].key);
    setPendingCellKeys(prev => addExcelSetValues(prev, plan.keys));
    setCellErrors(prev => clearExcelCellErrors(prev, plan.keys));

    try {
      await enqueueCommitTask(async () => {
        for (const edit of plan.valid) {
          await commitCellValue(edit.cell, edit.nextValue, plan.reason);
        }
      });
    } finally {
      setPendingCellKeys(prev => removeExcelSetValues(prev, plan.keys));
    }
  }, [commitCellValue, enqueueCommitTask]);

  const commitEdit = useCallback(async (cell: ExcelCellModel, nextEditorValue: string) => {
    const plan = buildExcelSingleCellEditPlan(cell, nextEditorValue);
    if (plan.validationMessage) {
      setSelectedCellKey(plan.key);
      setCellErrors(prev => ({ ...prev, [plan.key]: plan.validationMessage }));
      return;
    }

    setSelectedCellKey(plan.key);
    setEditingCellKey(null);
    setCellErrors(prev => ({ ...prev, [plan.key]: undefined }));
    setPendingCellKeys(prev => addExcelSetValue(prev, plan.key));

    try {
      await enqueueCommitTask(async () => {
        await commitCellValue(cell, plan.nextValue, 'inline-edit');
      });
    } finally {
      setPendingCellKeys(prev => removeExcelSetValue(prev, plan.key));
    }
  }, [commitCellValue, enqueueCommitTask]);

  const startFillDrag = useCallback((cell: ExcelCellModel) => {
    if (!onCellCommit || !canInlineEditExcelCell(cell)) return;
    const key = getExcelCellKey(cell.itemId, cell.canonicalField);
    setSelectedCellKey(key);
    setFillDragSourceCell(cell);
    setFillDragTargetCellKey(key);
    setCellErrors(prev => ({ ...prev, [key]: undefined }));
  }, [onCellCommit]);

  const moveFillDrag = useCallback((cell: ExcelCellModel) => {
    setFillDragTargetCellKey(getExcelCellKey(cell.itemId, cell.canonicalField));
  }, []);

  const cancelFillDrag = useCallback(() => {
    setFillDragSourceCell(null);
    setFillDragTargetCellKey(null);
  }, []);

  const finishFillDrag = useCallback(async (cells: ExcelCellModel[]) => {
    const batchEdits = buildExcelFillDragBatchEdits(fillDragSourceCell, cells);
    setFillDragSourceCell(null);
    setFillDragTargetCellKey(null);
    if (!batchEdits.length) return;

    await commitBatchEdits(batchEdits, 'fill-drag');
  }, [commitBatchEdits, fillDragSourceCell]);

  const resetTransientState = useCallback(() => {
    setSelectedCellKey(null);
    setEditingCellKey(null);
    setPendingCellKeys(new Set());
    setCellErrors({});
    setValueOverrides({});
    for (const timer of Object.values(saveFlashTimers.current)) clearTimeout(timer);
    saveFlashTimers.current = {};
    setSavedCellKeys(new Set());
    setFillDragSourceCell(null);
    setFillDragTargetCellKey(null);
  }, []);

  return {
    selectedCellKey,
    editingCellKey,
    pendingCellKeys,
    cellErrors,
    valueOverrides,
    savedCellKeys,
    fillDragSourceCell,
    fillDragTargetCellKey,
    selectCell,
    startEdit,
    cancelEdit,
    commitEdit,
    commitBatchEdits,
    startFillDrag,
    moveFillDrag,
    finishFillDrag,
    cancelFillDrag,
    resetTransientState,
  };
}
