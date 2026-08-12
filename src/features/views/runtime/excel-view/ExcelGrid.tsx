/** @jsxImportSource preact */
import { h } from 'preact';
import { useRef } from 'preact/hooks';
import { ExcelCell } from './ExcelCell';
import {
  buildExcelColumnWidthStyle,
  buildExcelFillRange,
  buildExcelGridCell,
  buildExcelPastePlan,
  findExcelGridCellPosition,
  focusExcelCellElement,
  getExcelColumnBadge,
  getExcelColumnTitle,
  getExcelColumnWidth,
  getExcelGridCellKey,
  resolveExcelNavigationPosition,
  selectExcelCellByPosition,
} from './ExcelGridModel';
import type { ExcelCellModel, ExcelColumnModel, ExcelGridProps, ExcelNavigationDirection } from './types';

export function ExcelGrid({
  items,
  columns,
  selectedCellKey,
  editingCellKey,
  pendingCellKeys,
  savedCellKeys,
  cellErrors,
  valueOverrides,
  canCommitCells = false,
  columnWidths,
  contentDisplayMode = 'previewText',
  messageRenderPort,
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
  onOpenRecordOrigin,
}: ExcelGridProps) {
  const tableRef = useRef<HTMLTableElement | null>(null);

  const makeCell = (item: ExcelCellModel['item'], columnKey: string): ExcelCellModel => (
    buildExcelGridCell(item, columnKey, valueOverrides)
  );

  const selectByPosition = (rowIndex: number, colIndex: number) => {
    const selection = selectExcelCellByPosition({ items, columns, rowIndex, colIndex, valueOverrides });
    if (!selection) return;
    onSelectCell?.(selection.cell);
    focusExcelCellElement(tableRef.current, selection.cellKey);
  };

  const navigateCell = (cell: ExcelCellModel, direction: ExcelNavigationDirection) => {
    const position = findExcelGridCellPosition(items, columns, cell);
    const nextPosition = resolveExcelNavigationPosition(position, direction, items.length, columns.length);
    if (!nextPosition) return;
    selectByPosition(nextPosition.rowIndex, nextPosition.colIndex);
  };

  const pasteFromCell = (startCell: ExcelCellModel, text: string) => {
    if (!onCommitBatchEdits || !canCommitCells) return;
    const plan = buildExcelPastePlan({ items, columns, startCell, text, canCommitCells, valueOverrides });
    if (plan.lastCell) {
      onSelectCell?.(plan.lastCell);
      focusExcelCellElement(tableRef.current, getExcelGridCellKey(plan.lastCell));
    }
    if (plan.edits.length) onCommitBatchEdits(plan.edits, 'paste');
  };

  const finishFillDrag = (target: ExcelCellModel) => {
    onFinishFillDrag?.(buildExcelFillRange({ items, source: fillDragSourceCell, target, valueOverrides }));
  };

  const startColumnResize = (event: MouseEvent, column: ExcelColumnModel) => {
    event.preventDefault();
    event.stopPropagation();

    const th = (event.currentTarget as HTMLElement).closest('th') as HTMLElement | null;
    const startX = event.clientX;
    const startWidth = getExcelColumnWidth(column, columnWidths?.[column.key]) || th?.offsetWidth || 150;

    const move = (moveEvent: MouseEvent) => {
      onColumnWidthDraftChange?.(column.key, startWidth + (moveEvent.clientX - startX));
    };

    const up = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', move as any, true);
      window.removeEventListener('mouseup', up as any, true);
      document.body.classList.remove('excel-view-is-resizing-column');
      onColumnWidthCommit?.(column.key, startWidth + (upEvent.clientX - startX));
    };

    document.body.classList.add('excel-view-is-resizing-column');
    window.addEventListener('mousemove', move as any, true);
    window.addEventListener('mouseup', up as any, true);
  };

  return (
    <table ref={tableRef as any} class="think-table excel-view-table">
      <colgroup>
        {columns.map(column => {
          const width = getExcelColumnWidth(column, columnWidths?.[column.key]);
          return <col key={column.key} data-field={column.key} style={{ width: `${width}px` }} />;
        })}
      </colgroup>
      <thead>
        <tr>{columns.map(column => {
          const width = getExcelColumnWidth(column, columnWidths?.[column.key]);
          const columnEditable = column.editable && canCommitCells;
          return (
            <th
              key={column.key}
              data-field={column.key}
              data-canonical-field={column.canonicalField}
              data-editable={columnEditable ? 'true' : 'false'}
              data-editor-kind={column.editorKind}
              data-danger-level={column.dangerLevel}
              title={getExcelColumnTitle(column, canCommitCells)}
              style={buildExcelColumnWidthStyle(width)}
            >
              <span class="excel-view-header-stack">
                <span class="excel-view-header-label">{column.label}</span>
                <span class="excel-view-header-badge">{getExcelColumnBadge(column, canCommitCells)}</span>
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
              const cellKey = getExcelGridCellKey(cell);
              const width = getExcelColumnWidth(column, columnWidths?.[column.key]);
              return (
                <ExcelCell
                  key={column.key}
                  cell={cell}
                  selected={selectedCellKey === cellKey}
                  editing={editingCellKey === cellKey}
                  pending={pendingCellKeys?.has(cellKey)}
                  saved={savedCellKeys?.has(cellKey)}
                  error={cellErrors?.[cellKey]}
                  canCommit={canCommitCells}
                  fillDragging={!!fillDragSourceCell}
                  fillSource={fillDragSourceCell ? getExcelGridCellKey(fillDragSourceCell) === cellKey : false}
                  fillTarget={fillDragTargetCellKey === cellKey && fillDragSourceCell?.canonicalField === cell.canonicalField}
                  contentDisplayMode={contentDisplayMode}
                  messageRenderPort={messageRenderPort}
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
                  onOpenRecordOrigin={onOpenRecordOrigin}
                  style={buildExcelColumnWidthStyle(width) as any}
                />
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
