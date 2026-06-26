import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { areExcelCellValuesEqual, parseExcelEditorValue, validateExcelEditorValue } from './value';
import type { ExcelCellBatchEdit, ExcelCellCommitReason, ExcelCellEditingState, ExcelCellModel, UseExcelCellEditingOptions } from './types';
import { canInlineEditExcelCell, getExcelCellKey } from './types';

function addPendingKey(source: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(source);
  next.add(key);
  return next;
}

function addPendingKeys(source: ReadonlySet<string>, keys: string[]): Set<string> {
  const next = new Set(source);
  for (const key of keys) next.add(key);
  return next;
}

function removePendingKey(source: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(source);
  next.delete(key);
  return next;
}

function removePendingKeys(source: ReadonlySet<string>, keys: string[]): Set<string> {
  const next = new Set(source);
  for (const key of keys) next.delete(key);
  return next;
}

function addSavedKey(source: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(source);
  next.add(key);
  return next;
}

function removeSavedKey(source: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(source);
  next.delete(key);
  return next;
}

function uniqueKeys(keys: string[]): string[] {
  return Array.from(new Set(keys));
}

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
    setSavedCellKeys(prev => addSavedKey(prev, key));
    saveFlashTimers.current[key] = setTimeout(() => {
      setSavedCellKeys(prev => removeSavedKey(prev, key));
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
      setCellErrors(prev => ({ ...prev, [key]: '当前视图没有配置保存处理器' }));
      return;
    }
    if (!canInlineEditExcelCell(cell)) {
      setCellErrors(prev => ({ ...prev, [key]: cell.policy.reason || '该字段不可内联编辑' }));
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
      setCellErrors(prev => ({ ...prev, [key]: '当前视图没有配置保存处理器' }));
      return false;
    }

    if (!canInlineEditExcelCell(cell)) {
      setCellErrors(prev => ({ ...prev, [key]: cell.policy.reason || '该字段不可内联编辑' }));
      return false;
    }

    if (areExcelCellValuesEqual(cell.value, nextValue)) return true;

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
        setCellErrors(prev => ({ ...prev, [key]: result?.message || '保存失败' }));
        return false;
      }

      const normalizedValue = result.normalizedValue !== undefined ? result.normalizedValue : nextValue;
      setValueOverrides(prev => ({ ...prev, [key]: normalizedValue }));
      setCellErrors(prev => ({ ...prev, [key]: undefined }));
      flashSavedKey(key);
      return true;
    } catch (error) {
      setCellErrors(prev => ({ ...prev, [key]: error instanceof Error ? error.message : '保存失败' }));
      return false;
    }
  }, [flashSavedKey, onCellCommit]);

  const commitBatchEdits = useCallback(async (edits: ExcelCellBatchEdit[], reason: ExcelCellCommitReason) => {
    if (!edits.length) return;

    const prepared = edits.map(edit => {
      const key = getExcelCellKey(edit.cell.itemId, edit.cell.canonicalField);
      const validationMessage = validateExcelEditorValue(edit.cell, edit.editorValue);
      const nextValue = validationMessage ? undefined : parseExcelEditorValue(edit.cell, edit.editorValue);
      return { ...edit, key, validationMessage, nextValue };
    });

    const invalid = prepared.filter(edit => edit.validationMessage);
    if (invalid.length) {
      setCellErrors(prev => {
        const next = { ...prev };
        for (const edit of invalid) next[edit.key] = edit.validationMessage || '字段值无效';
        return next;
      });
    }

    const valid = prepared.filter(edit => !edit.validationMessage && canInlineEditExcelCell(edit.cell));
    if (!valid.length) return;

    const keys = uniqueKeys(valid.map(edit => edit.key));
    setEditingCellKey(null);
    setSelectedCellKey(valid[valid.length - 1].key);
    setPendingCellKeys(prev => addPendingKeys(prev, keys));
    setCellErrors(prev => {
      const next = { ...prev };
      for (const key of keys) next[key] = undefined;
      return next;
    });

    try {
      await enqueueCommitTask(async () => {
        for (const edit of valid) {
          await commitCellValue(edit.cell, edit.nextValue, reason);
        }
      });
    } finally {
      setPendingCellKeys(prev => removePendingKeys(prev, keys));
    }
  }, [commitCellValue, enqueueCommitTask]);

  const commitEdit = useCallback(async (cell: ExcelCellModel, nextEditorValue: string) => {
    const key = getExcelCellKey(cell.itemId, cell.canonicalField);
    const validationMessage = validateExcelEditorValue(cell, nextEditorValue);
    if (validationMessage) {
      setSelectedCellKey(key);
      setCellErrors(prev => ({ ...prev, [key]: validationMessage }));
      return;
    }

    const nextValue = parseExcelEditorValue(cell, nextEditorValue);

    setSelectedCellKey(key);
    setEditingCellKey(null);
    setCellErrors(prev => ({ ...prev, [key]: undefined }));
    setPendingCellKeys(prev => addPendingKey(prev, key));

    try {
      await enqueueCommitTask(async () => {
        await commitCellValue(cell, nextValue, 'inline-edit');
      });
    } finally {
      setPendingCellKeys(prev => removePendingKey(prev, key));
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
    const source = fillDragSourceCell;
    setFillDragSourceCell(null);
    setFillDragTargetCellKey(null);
    if (!source || !cells.length) return;

    const targetCells = cells.filter(cell => cell.itemId !== source.itemId && cell.canonicalField === source.canonicalField && canInlineEditExcelCell(cell));
    if (!targetCells.length) return;

    await commitBatchEdits(targetCells.map(cell => ({ cell, editorValue: source.editorValue })), 'fill-drag');
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
