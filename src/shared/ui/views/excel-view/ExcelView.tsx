/** @jsxImportSource preact */
import { h } from 'preact';
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { getAllFields, getFieldCategoryLabel, getFieldLabel, normalizeDisplayFields } from '@core/public';
import { ExcelColumnToolbar } from './ExcelColumnToolbar';
import { ExcelGrid } from './ExcelGrid';
import { buildExcelColumns } from './value';
import { useExcelCellEditing } from './useExcelCellEditing';
import { getObsidianEventBoundaryProps } from '../../events/obsidianEventBoundary';
import type { ExcelColumnWidthMap, ExcelViewDisplayConfig, ExcelViewProps } from './types';

function normalizeColumnWidth(width: number): number {
  if (!Number.isFinite(width)) return 160;
  return Math.max(80, Math.min(640, Math.round(width)));
}

function normalizeColumnWidths(widths?: ExcelColumnWidthMap): ExcelColumnWidthMap {
  if (!widths) return {};
  const next: ExcelColumnWidthMap = {};
  for (const [field, width] of Object.entries(widths)) {
    if (!field) continue;
    next[field] = normalizeColumnWidth(Number(width));
  }
  return next;
}

export function ExcelView({
  items,
  fields,
  app,
  availableFields,
  excelConfig,
  onFieldsChange,
  onExcelConfigChange,
  onCellCommit,
  onOpenRecord,
}: ExcelViewProps) {
  const discoveredFields = useMemo(() => getAllFields(items), [items]);
  const normalizedAvailableFields = useMemo(() => normalizeDisplayFields(
    availableFields?.length ? availableFields : discoveredFields,
    { includeUnknown: false },
  ), [availableFields, discoveredFields]);

  const displayFields = useMemo(() => normalizeDisplayFields(
    fields && fields.length ? fields : normalizedAvailableFields,
    {
      availableFields: normalizedAvailableFields,
      includeUnknown: true,
      fallbackFields: normalizedAvailableFields,
    },
  ), [fields, normalizedAvailableFields]);

  const columns = useMemo(() => buildExcelColumns(displayFields), [displayFields]);
  const itemSignature = useMemo(() => items.map(item => `${item.id}:${item.modified ?? ''}`).join('|'), [items]);
  const persistedColumnWidths = useMemo(() => normalizeColumnWidths(excelConfig?.columnWidths), [excelConfig?.columnWidths]);
  const editing = useExcelCellEditing({ onCellCommit });
  const resetTransientState = editing.resetTransientState;
  const editableColumnCount = columns.filter(column => column.editable).length;
  const readonlyColumnCount = Math.max(0, columns.length - editableColumnCount);
  const [fieldConfigSaving, setFieldConfigSaving] = useState(false);
  const [fieldConfigError, setFieldConfigError] = useState<string | null>(null);
  const [excelConfigSaving, setExcelConfigSaving] = useState(false);
  const [localColumnWidths, setLocalColumnWidths] = useState<ExcelColumnWidthMap>(persistedColumnWidths);

  useEffect(() => {
    resetTransientState();
  }, [itemSignature, resetTransientState]);

  useEffect(() => {
    setLocalColumnWidths(persistedColumnWidths);
  }, [persistedColumnWidths]);

  const handleFieldsChange = useCallback(async (nextFields: string[]) => {
    if (!onFieldsChange || fieldConfigSaving) return;
    const normalizedNextFields = normalizeDisplayFields(nextFields, {
      availableFields: normalizedAvailableFields,
      includeUnknown: true,
      fallbackFields: displayFields,
    });

    setFieldConfigSaving(true);
    setFieldConfigError(null);
    try {
      await onFieldsChange(normalizedNextFields);
    } catch (error) {
      const message = error instanceof Error ? error.message : '字段设置保存失败';
      setFieldConfigError(message);
    } finally {
      setFieldConfigSaving(false);
    }
  }, [displayFields, fieldConfigSaving, normalizedAvailableFields, onFieldsChange]);

  const handleColumnWidthDraftChange = useCallback((field: string, width: number) => {
    const nextWidth = normalizeColumnWidth(width);
    setLocalColumnWidths(prev => ({ ...prev, [field]: nextWidth }));
  }, []);

  const handleColumnWidthCommit = useCallback(async (field: string, width: number) => {
    const nextWidth = normalizeColumnWidth(width);
    const nextColumnWidths = {
      ...localColumnWidths,
      [field]: nextWidth,
    };

    setLocalColumnWidths(nextColumnWidths);
    if (!onExcelConfigChange) return;

    const nextConfig: ExcelViewDisplayConfig = {
      ...(excelConfig || {}),
      columnWidths: nextColumnWidths,
    };

    setExcelConfigSaving(true);
    try {
      await onExcelConfigChange(nextConfig);
    } catch (error) {
      console.error('[ExcelView] 保存列宽失败', error);
      setLocalColumnWidths(persistedColumnWidths);
    } finally {
      setExcelConfigSaving(false);
    }
  }, [excelConfig, localColumnWidths, onExcelConfigChange, persistedColumnWidths]);

  return (
    <div
      class="excel-view-shell"
      data-inline-edit={onCellCommit ? 'enabled' : 'disabled'}
      data-column-config={onFieldsChange ? 'enabled' : 'disabled'}
      data-excel-config-saving={excelConfigSaving ? 'true' : 'false'}
      {...getObsidianEventBoundaryProps()}
    >
      <div class="excel-view-toolbar" aria-label="Excel 视图编辑说明">
        <span class="excel-view-legend-chip is-editable">可编辑 {editableColumnCount}</span>
        <span class="excel-view-legend-chip is-readonly">只读 {readonlyColumnCount}</span>
        <span class="excel-view-legend-note">双击/Enter/F2 编辑；方向键/Tab 导航；支持多行多列粘贴；路径、文件、派生字段保持只读。</span>
      </div>
      <ExcelColumnToolbar
        fields={displayFields}
        availableFields={normalizedAvailableFields}
        saving={fieldConfigSaving}
        error={fieldConfigError}
        disabled={!onFieldsChange}
        getFieldLabel={getFieldLabel}
        getFieldGroupLabel={getFieldCategoryLabel}
        onFieldsChange={handleFieldsChange}
      />
      <ExcelGrid
        items={items}
        columns={columns}
        app={app}
        selectedCellKey={editing.selectedCellKey}
        editingCellKey={editing.editingCellKey}
        pendingCellKeys={editing.pendingCellKeys}
        savedCellKeys={editing.savedCellKeys}
        cellErrors={editing.cellErrors}
        valueOverrides={editing.valueOverrides}
        canCommitCells={!!onCellCommit}
        columnWidths={localColumnWidths}
        fillDragSourceCell={editing.fillDragSourceCell}
        fillDragTargetCellKey={editing.fillDragTargetCellKey}
        onSelectCell={editing.selectCell}
        onStartEdit={editing.startEdit}
        onCancelEdit={editing.cancelEdit}
        onCommitEdit={editing.commitEdit}
        onCommitBatchEdits={editing.commitBatchEdits}
        onStartFillDrag={editing.startFillDrag}
        onMoveFillDrag={editing.moveFillDrag}
        onFinishFillDrag={editing.finishFillDrag}
        onCancelFillDrag={editing.cancelFillDrag}
        onColumnWidthDraftChange={handleColumnWidthDraftChange}
        onColumnWidthCommit={handleColumnWidthCommit}
        onOpenRecord={onOpenRecord}
      />
    </div>
  );
}
