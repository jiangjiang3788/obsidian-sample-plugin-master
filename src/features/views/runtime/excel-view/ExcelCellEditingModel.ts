import { areExcelCellValuesEqual, parseExcelEditorValue, validateExcelEditorValue } from './value';
import type { ExcelCellBatchEdit, ExcelCellCommitReason, ExcelCellModel } from './types';
import { canInlineEditExcelCell, getExcelCellKey } from './types';

export interface ExcelPreparedCellEdit extends ExcelCellBatchEdit {
  key: string;
  validationMessage?: string;
  editable: boolean;
  nextValue?: unknown;
}

export interface ExcelSingleCellEditPlan {
  key: string;
  validationMessage?: string;
  nextValue?: unknown;
}

export interface ExcelCellCommitPlan {
  prepared: ExcelPreparedCellEdit[];
  invalid: ExcelPreparedCellEdit[];
  valid: ExcelPreparedCellEdit[];
  keys: string[];
  reason: ExcelCellCommitReason;
}

export function addExcelSetValue(source: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(source);
  next.add(key);
  return next;
}

export function addExcelSetValues(source: ReadonlySet<string>, keys: string[]): Set<string> {
  const next = new Set(source);
  for (const key of keys) next.add(key);
  return next;
}

export function removeExcelSetValue(source: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(source);
  next.delete(key);
  return next;
}

export function removeExcelSetValues(source: ReadonlySet<string>, keys: string[]): Set<string> {
  const next = new Set(source);
  for (const key of keys) next.delete(key);
  return next;
}

export function uniqueExcelKeys(keys: string[]): string[] {
  return Array.from(new Set(keys));
}

export function getExcelCellCommitFailureMessage(resultMessage?: string): string {
  return resultMessage || '保存失败';
}

export function getExcelCellCommitExceptionMessage(error: unknown): string {
  return error instanceof Error ? error.message : '保存失败';
}

export function getExcelCellNoCommitHandlerMessage(): string {
  return '当前视图没有配置保存处理器';
}

export function getExcelCellReadonlyMessage(cell: ExcelCellModel): string {
  return cell.policy.reason || '该字段不可内联编辑';
}

export function buildExcelSingleCellEditPlan(cell: ExcelCellModel, nextEditorValue: string): ExcelSingleCellEditPlan {
  const key = getExcelCellKey(cell.itemId, cell.canonicalField);
  const validationMessage = validateExcelEditorValue(cell, nextEditorValue);
  return {
    key,
    validationMessage: validationMessage ?? undefined,
    nextValue: validationMessage ? undefined : parseExcelEditorValue(cell, nextEditorValue),
  };
}

export function prepareExcelCellBatchEdit(edit: ExcelCellBatchEdit): ExcelPreparedCellEdit {
  const key = getExcelCellKey(edit.cell.itemId, edit.cell.canonicalField);
  const validationMessage = validateExcelEditorValue(edit.cell, edit.editorValue);
  return {
    ...edit,
    key,
    validationMessage: validationMessage ?? undefined,
    editable: canInlineEditExcelCell(edit.cell),
    nextValue: validationMessage ? undefined : parseExcelEditorValue(edit.cell, edit.editorValue),
  };
}

export function buildExcelCellCommitPlan(edits: ExcelCellBatchEdit[], reason: ExcelCellCommitReason): ExcelCellCommitPlan {
  const prepared = edits.map(prepareExcelCellBatchEdit);
  const invalid = prepared.filter(edit => edit.validationMessage);
  const valid = prepared.filter(edit => !edit.validationMessage && edit.editable);
  return {
    prepared,
    invalid,
    valid,
    keys: uniqueExcelKeys(valid.map(edit => edit.key)),
    reason,
  };
}

export function buildExcelCellValidationErrors(
  current: Readonly<Record<string, string | undefined>>,
  invalid: ExcelPreparedCellEdit[],
): Record<string, string | undefined> {
  const next = { ...current };
  for (const edit of invalid) next[edit.key] = edit.validationMessage || '字段值无效';
  return next;
}

export function clearExcelCellErrors(
  current: Readonly<Record<string, string | undefined>>,
  keys: string[],
): Record<string, string | undefined> {
  const next = { ...current };
  for (const key of keys) next[key] = undefined;
  return next;
}

export function getExcelCommittedValue(nextValue: unknown, normalizedValue?: unknown): unknown {
  return normalizedValue !== undefined ? normalizedValue : nextValue;
}

export function shouldSkipExcelCommit(cell: ExcelCellModel, nextValue: unknown): boolean {
  return areExcelCellValuesEqual(cell.value, nextValue);
}

export function getExcelFillDragTargetCells(source: ExcelCellModel | null, cells: ExcelCellModel[]): ExcelCellModel[] {
  if (!source || !cells.length) return [];
  return cells.filter(cell => (
    cell.itemId !== source.itemId
    && cell.canonicalField === source.canonicalField
    && canInlineEditExcelCell(cell)
  ));
}

export function buildExcelFillDragBatchEdits(source: ExcelCellModel | null, cells: ExcelCellModel[]): ExcelCellBatchEdit[] {
  return getExcelFillDragTargetCells(source, cells).map(cell => ({ cell, editorValue: source?.editorValue || '' }));
}
