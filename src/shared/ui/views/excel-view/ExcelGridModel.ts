import { buildExcelCellModel } from './value';
import { canInlineEditExcelCell, getExcelCellKey } from './types';
import type { ExcelCellBatchEdit, ExcelCellModel, ExcelColumnModel, ExcelNavigationDirection } from './types';
import type { Item } from '@core/public';

export interface ExcelGridPosition {
  rowIndex: number;
  colIndex: number;
}

export interface ExcelGridSelectionResult {
  cell: ExcelCellModel;
  cellKey: string;
}

export interface ExcelPastePlan {
  edits: ExcelCellBatchEdit[];
  lastCell: ExcelCellModel | null;
}

export function getExcelGridCellKey(cell: ExcelCellModel): string {
  return getExcelCellKey(cell.itemId, cell.canonicalField);
}

export function getExcelColumnBadge(column: ExcelColumnModel, canCommitCells: boolean): string {
  if (!column.editable || !canCommitCells) return '只读';
  if (column.dangerLevel === 'medium') return '谨慎';
  return '可编辑';
}

export function getExcelColumnTitle(column: ExcelColumnModel, canCommitCells: boolean): string {
  if (!canCommitCells) return '当前视图未配置保存处理器，所有字段暂不可编辑';
  if (!column.editable) return column.readonlyReason || '该字段不可在 Excel 单元格内直接编辑';
  if (column.dangerLevel === 'medium') return '可编辑字段，但会影响时间、标签等结构化内容，请谨慎修改';
  return '可编辑字段：双击单元格可编辑；拖动表头右侧边缘可调整列宽';
}

export function getExcelColumnWidth(column: ExcelColumnModel, width?: number): number {
  if (Number.isFinite(width) && width) return Math.max(80, Math.min(640, Math.round(width)));
  if (column.canonicalField === 'content') return 240;
  if (column.canonicalField === 'title') return 180;
  if (column.editorKind === 'date' || column.editorKind === 'time') return 128;
  if (column.editorKind === 'number' || column.editorKind === 'rating') return 104;
  return 150;
}

export function buildExcelColumnWidthStyle(width: number): Record<string, string> {
  const text = `${width}px`;
  return { width: text, minWidth: text, maxWidth: text };
}

export function normalizeExcelClipboardText(text: string): string {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function parseExcelClipboardMatrix(text: string): string[][] {
  const normalized = normalizeExcelClipboardText(text);
  const withoutFinalNewline = normalized.endsWith('\n') ? normalized.slice(0, -1) : normalized;
  if (!withoutFinalNewline) return [['']];
  return withoutFinalNewline.split('\n').map(row => row.split('\t'));
}

export function focusExcelCellElement(table: HTMLTableElement | null, cellKey: string): void {
  if (!table || !cellKey) return;
  const escaped = cellKey.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  window.requestAnimationFrame(() => {
    const element = table.querySelector(`[data-excel-cell-key="${escaped}"]`) as HTMLElement | null;
    element?.focus?.();
  });
}

export function buildExcelGridCell(
  item: Item,
  columnKey: string,
  valueOverrides?: Readonly<Record<string, unknown>>
): ExcelCellModel {
  const optimisticKey = getExcelCellKey(item.id, columnKey);
  const cell = buildExcelCellModel(item, columnKey, valueOverrides?.[optimisticKey]);
  const canonicalKey = getExcelCellKey(cell.itemId, cell.canonicalField);
  if (valueOverrides?.[canonicalKey] !== undefined && canonicalKey !== optimisticKey) {
    return buildExcelCellModel(item, columnKey, valueOverrides[canonicalKey]);
  }
  return cell;
}

export function findExcelGridCellPosition(
  items: Item[],
  columns: ExcelColumnModel[],
  cell: ExcelCellModel
): ExcelGridPosition {
  return {
    rowIndex: items.findIndex(item => item.id === cell.itemId),
    colIndex: columns.findIndex(column => column.canonicalField === cell.canonicalField),
  };
}

export function resolveExcelNavigationPosition(
  position: ExcelGridPosition,
  direction: ExcelNavigationDirection,
  rowCount: number,
  columnCount: number
): ExcelGridPosition | null {
  const { rowIndex, colIndex } = position;
  if (rowIndex < 0 || colIndex < 0 || rowCount <= 0 || columnCount <= 0) return null;
  if (direction === 'up') return { rowIndex: rowIndex - 1, colIndex };
  if (direction === 'down') return { rowIndex: rowIndex + 1, colIndex };
  if (direction === 'left') return { rowIndex, colIndex: colIndex - 1 };
  if (direction === 'right') return { rowIndex, colIndex: colIndex + 1 };

  const linearIndex = rowIndex * columnCount + colIndex + (direction === 'previous' ? -1 : 1);
  const bounded = Math.max(0, Math.min(rowCount * columnCount - 1, linearIndex));
  return { rowIndex: Math.floor(bounded / columnCount), colIndex: bounded % columnCount };
}

export function selectExcelCellByPosition(params: {
  items: Item[];
  columns: ExcelColumnModel[];
  rowIndex: number;
  colIndex: number;
  valueOverrides?: Readonly<Record<string, unknown>>;
}): ExcelGridSelectionResult | null {
  const { items, columns, valueOverrides } = params;
  if (!items.length || !columns.length) return null;
  const rowIndex = Math.max(0, Math.min(items.length - 1, params.rowIndex));
  const colIndex = Math.max(0, Math.min(columns.length - 1, params.colIndex));
  const cell = buildExcelGridCell(items[rowIndex], columns[colIndex].key, valueOverrides);
  return { cell, cellKey: getExcelGridCellKey(cell) };
}

export function buildExcelFillRange(params: {
  items: Item[];
  source: ExcelCellModel | null | undefined;
  target: ExcelCellModel;
  valueOverrides?: Readonly<Record<string, unknown>>;
}): ExcelCellModel[] {
  const { items, source, target, valueOverrides } = params;
  if (!source) return [];
  if (source.canonicalField !== target.canonicalField) return [];
  if (!canInlineEditExcelCell(source) || !canInlineEditExcelCell(target)) return [];

  const sourceIndex = items.findIndex(item => item.id === source.itemId);
  const targetIndex = items.findIndex(item => item.id === target.itemId);
  if (sourceIndex < 0 || targetIndex < 0) return [];

  const from = Math.min(sourceIndex, targetIndex);
  const to = Math.max(sourceIndex, targetIndex);
  return items.slice(from, to + 1).map(item => buildExcelGridCell(item, source.field, valueOverrides));
}

export function buildExcelPastePlan(params: {
  items: Item[];
  columns: ExcelColumnModel[];
  startCell: ExcelCellModel;
  text: string;
  canCommitCells: boolean;
  valueOverrides?: Readonly<Record<string, unknown>>;
}): ExcelPastePlan {
  const { items, columns, startCell, text, canCommitCells, valueOverrides } = params;
  const { rowIndex, colIndex } = findExcelGridCellPosition(items, columns, startCell);
  if (rowIndex < 0 || colIndex < 0) return { edits: [], lastCell: null };

  const matrix = parseExcelClipboardMatrix(text);
  const edits: ExcelCellBatchEdit[] = [];
  let lastCell: ExcelCellModel | null = null;

  for (let rowOffset = 0; rowOffset < matrix.length; rowOffset += 1) {
    for (let colOffset = 0; colOffset < matrix[rowOffset].length; colOffset += 1) {
      const targetRow = rowIndex + rowOffset;
      const targetCol = colIndex + colOffset;
      if (targetRow >= items.length || targetCol >= columns.length) continue;
      const targetCell = buildExcelGridCell(items[targetRow], columns[targetCol].key, valueOverrides);
      lastCell = targetCell;
      if (!canInlineEditExcelCell(targetCell, canCommitCells)) continue;
      edits.push({ cell: targetCell, editorValue: matrix[rowOffset][colOffset] });
    }
  }

  return { edits, lastCell };
}
