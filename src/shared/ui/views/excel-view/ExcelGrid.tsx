/** @jsxImportSource preact */
import { h } from 'preact';
import { useRef } from 'preact/hooks';
import { ExcelCell } from './ExcelCell';
import { buildExcelCellModel } from './value';
import { canInlineEditExcelCell, getExcelCellKey } from './types';
import type { ExcelCellBatchEdit, ExcelCellModel, ExcelColumnModel, ExcelGridProps, ExcelNavigationDirection } from './types';

function getCellKey(cell: ExcelCellModel): string {
  return getExcelCellKey(cell.itemId, cell.canonicalField);
}

function getColumnBadge(column: ExcelColumnModel, canCommitCells: boolean): string {
  if (!column.editable || !canCommitCells) return '只读';
  if (column.dangerLevel === 'medium') return '谨慎';
  return '可编辑';
}

function getColumnTitle(column: ExcelColumnModel, canCommitCells: boolean): string {
  if (!canCommitCells) return '当前视图未配置保存处理器，所有字段暂不可编辑';
  if (!column.editable) return column.readonlyReason || '该字段不可在 Excel 单元格内直接编辑';
  if (column.dangerLevel === 'medium') return '可编辑字段，但会影响时间、标签等结构化内容，请谨慎修改';
  return '可编辑字段：双击单元格可编辑；拖动表头右侧边缘可调整列宽';
}

function getColumnWidth(column: ExcelColumnModel, width?: number): number {
  if (Number.isFinite(width) && width) return Math.max(80, Math.min(640, Math.round(width)));
  if (column.canonicalField === 'content') return 240;
  if (column.canonicalField === 'title') return 180;
  if (column.editorKind === 'date' || column.editorKind === 'time') return 128;
  if (column.editorKind === 'number' || column.editorKind === 'rating') return 104;
  return 150;
}

function normalizeClipboardText(text: string): string {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function parseClipboardMatrix(text: string): string[][] {
  const normalized = normalizeClipboardText(text);
  const withoutFinalNewline = normalized.endsWith('\n') ? normalized.slice(0, -1) : normalized;
  if (!withoutFinalNewline) return [['']];
  return withoutFinalNewline.split('\n').map(row => row.split('\t'));
}

function focusCellElement(table: HTMLTableElement | null, cellKey: string): void {
  if (!table || !cellKey) return;
  const escaped = cellKey.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  window.requestAnimationFrame(() => {
    const element = table.querySelector(`[data-excel-cell-key="${escaped}"]`) as HTMLElement | null;
    element?.focus?.();
  });
}

export function ExcelGrid({
  items,
  columns,
  app,
  selectedCellKey,
  editingCellKey,
  pendingCellKeys,
  savedCellKeys,
  cellErrors,
  valueOverrides,
  canCommitCells = false,
  columnWidths,
  fillDragSourceCell,
  fillDragTargetCellKey,
  onSelectCell,
  onStartEdit,
  onCancelEdit,
  onCommitEdit,
  onCommitBatchEdits,
  onStartFillDrag,
  onMoveFillDrag,
  onFinishFillDrag,
  onCancelFillDrag,
  onColumnWidthDraftChange,
  onColumnWidthCommit,
  onOpenRecord,
}: ExcelGridProps) {
  const tableRef = useRef<HTMLTableElement | null>(null);

  const makeCell = (item: ExcelCellModel['item'], columnKey: string): ExcelCellModel => {
    const optimisticKey = getExcelCellKey(item.id, columnKey);
    const cell = buildExcelCellModel(item, columnKey, valueOverrides?.[optimisticKey]);
    const canonicalKey = getExcelCellKey(cell.itemId, cell.canonicalField);
    if (valueOverrides?.[canonicalKey] !== undefined && canonicalKey !== optimisticKey) {
      return buildExcelCellModel(item, columnKey, valueOverrides[canonicalKey]);
    }
    return cell;
  };

  const buildFillRange = (target: ExcelCellModel): ExcelCellModel[] => {
    const source = fillDragSourceCell;
    if (!source) return [];
    if (source.canonicalField !== target.canonicalField) return [];
    if (!canInlineEditExcelCell(source) || !canInlineEditExcelCell(target)) return [];

    const sourceIndex = items.findIndex(item => item.id === source.itemId);
    const targetIndex = items.findIndex(item => item.id === target.itemId);
    if (sourceIndex < 0 || targetIndex < 0) return [];

    const from = Math.min(sourceIndex, targetIndex);
    const to = Math.max(sourceIndex, targetIndex);
    const columnKey = source.field;
    return items.slice(from, to + 1).map(item => makeCell(item, columnKey));
  };

  const finishFillDrag = (target: ExcelCellModel) => {
    onFinishFillDrag?.(buildFillRange(target));
  };

  const findCellPosition = (cell: ExcelCellModel): { rowIndex: number; colIndex: number } => ({
    rowIndex: items.findIndex(item => item.id === cell.itemId),
    colIndex: columns.findIndex(column => column.canonicalField === cell.canonicalField),
  });

  const selectByPosition = (rowIndex: number, colIndex: number) => {
    if (!items.length || !columns.length) return;
    const boundedRow = Math.max(0, Math.min(items.length - 1, rowIndex));
    const boundedCol = Math.max(0, Math.min(columns.length - 1, colIndex));
    const nextCell = makeCell(items[boundedRow], columns[boundedCol].key);
    onSelectCell?.(nextCell);
    focusCellElement(tableRef.current, getCellKey(nextCell));
  };

  const navigateCell = (cell: ExcelCellModel, direction: ExcelNavigationDirection) => {
    const { rowIndex, colIndex } = findCellPosition(cell);
    if (rowIndex < 0 || colIndex < 0) return;

    if (direction === 'up') return selectByPosition(rowIndex - 1, colIndex);
    if (direction === 'down') return selectByPosition(rowIndex + 1, colIndex);
    if (direction === 'left') return selectByPosition(rowIndex, colIndex - 1);
    if (direction === 'right') return selectByPosition(rowIndex, colIndex + 1);

    const linearIndex = rowIndex * columns.length + colIndex + (direction === 'previous' ? -1 : 1);
    const bounded = Math.max(0, Math.min(items.length * columns.length - 1, linearIndex));
    selectByPosition(Math.floor(bounded / columns.length), bounded % columns.length);
  };

  const pasteFromCell = (startCell: ExcelCellModel, text: string) => {
    if (!onCommitBatchEdits || !canCommitCells) return;
    const { rowIndex, colIndex } = findCellPosition(startCell);
    if (rowIndex < 0 || colIndex < 0) return;

    const matrix = parseClipboardMatrix(text);
    const edits: ExcelCellBatchEdit[] = [];
    let lastCell: ExcelCellModel | null = null;

    for (let rowOffset = 0; rowOffset < matrix.length; rowOffset += 1) {
      for (let colOffset = 0; colOffset < matrix[rowOffset].length; colOffset += 1) {
        const targetRow = rowIndex + rowOffset;
        const targetCol = colIndex + colOffset;
        if (targetRow >= items.length || targetCol >= columns.length) continue;
        const targetCell = makeCell(items[targetRow], columns[targetCol].key);
        lastCell = targetCell;
        if (!canInlineEditExcelCell(targetCell, canCommitCells)) continue;
        edits.push({ cell: targetCell, editorValue: matrix[rowOffset][colOffset] });
      }
    }

    if (lastCell) {
      onSelectCell?.(lastCell);
      focusCellElement(tableRef.current, getCellKey(lastCell));
    }

    if (edits.length) onCommitBatchEdits(edits, 'paste');
  };

  const startColumnResize = (event: MouseEvent, column: ExcelColumnModel) => {
    event.preventDefault();
    event.stopPropagation();

    const th = (event.currentTarget as HTMLElement).closest('th') as HTMLElement | null;
    const startX = event.clientX;
    const startWidth = getColumnWidth(column, columnWidths?.[column.key]) || th?.offsetWidth || 150;

    const move = (moveEvent: MouseEvent) => {
      const nextWidth = startWidth + (moveEvent.clientX - startX);
      onColumnWidthDraftChange?.(column.key, nextWidth);
    };

    const up = (upEvent: MouseEvent) => {
      const nextWidth = startWidth + (upEvent.clientX - startX);
      window.removeEventListener('mousemove', move as any, true);
      window.removeEventListener('mouseup', up as any, true);
      document.body.classList.remove('excel-view-is-resizing-column');
      onColumnWidthCommit?.(column.key, nextWidth);
    };

    document.body.classList.add('excel-view-is-resizing-column');
    window.addEventListener('mousemove', move as any, true);
    window.addEventListener('mouseup', up as any, true);
  };

  return (
    <table ref={tableRef as any} class="think-table excel-view-table">
      <colgroup>
        {columns.map(column => {
          const width = getColumnWidth(column, columnWidths?.[column.key]);
          return <col key={column.key} data-field={column.key} style={{ width: `${width}px` }} />;
        })}
      </colgroup>
      <thead>
        <tr>{columns.map(column => {
          const columnEditable = column.editable && canCommitCells;
          const width = getColumnWidth(column, columnWidths?.[column.key]);
          return (
            <th
              key={column.key}
              data-field={column.key}
              data-canonical-field={column.canonicalField}
              data-editable={columnEditable ? 'true' : 'false'}
              data-editor-kind={column.editorKind}
              data-danger-level={column.dangerLevel}
              title={getColumnTitle(column, canCommitCells)}
              style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
            >
              <span class="excel-view-header-stack">
                <span class="excel-view-header-label">{column.label}</span>
                <span class="excel-view-header-badge">{getColumnBadge(column, canCommitCells)}</span>
              </span>
              <span
                class="excel-view-column-resize-handle"
                role="separator"
                aria-orientation="vertical"
                title="拖动调整列宽"
                onMouseDown={(event: MouseEvent) => startColumnResize(event, column)}
              />
            </th>
          );
        })}</tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.id} data-item-id={item.id}>
            {columns.map(column => {
              const cell = makeCell(item, column.key);
              const canonicalCellKey = getCellKey(cell);
              const fillDragging = !!fillDragSourceCell;
              const width = getColumnWidth(column, columnWidths?.[column.key]);
              return (
                <ExcelCell
                  key={column.key}
                  cell={cell}
                  app={app}
                  selected={selectedCellKey === canonicalCellKey}
                  editing={editingCellKey === canonicalCellKey}
                  pending={pendingCellKeys?.has(canonicalCellKey)}
                  saved={savedCellKeys?.has(canonicalCellKey)}
                  error={cellErrors?.[canonicalCellKey]}
                  canCommit={canCommitCells}
                  fillDragging={fillDragging}
                  fillSource={fillDragSourceCell ? getCellKey(fillDragSourceCell) === canonicalCellKey : false}
                  fillTarget={fillDragTargetCellKey === canonicalCellKey && fillDragSourceCell?.canonicalField === cell.canonicalField}
                  onSelect={onSelectCell}
                  onStartEdit={onStartEdit}
                  onCancelEdit={onCancelEdit}
                  onCommitEdit={onCommitEdit}
                  onNavigate={navigateCell}
                  onPasteText={pasteFromCell}
                  onStartFillDrag={onStartFillDrag}
                  onMoveFillDrag={onMoveFillDrag}
                  onFinishFillDrag={finishFillDrag}
                  onCancelFillDrag={onCancelFillDrag}
                  onOpenRecord={onOpenRecord}
                  style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } as any}
                />
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
