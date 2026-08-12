/** @jsxImportSource preact */
import { h } from 'preact';
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { diagnosticError } from '@shared/utils/public';
import { normalizeDisplayFields } from '@core/view/public';
import { ExcelGrid } from './ExcelGrid';
import { useExcelCellEditing } from './useExcelCellEditing';
import { getObsidianEventBoundaryProps } from '@shared/ui/public';
import { ExcelViewToolbar } from './ExcelViewToolbar';
import {
  buildExcelContentModeButtonTitle,
  buildExcelViewRenderModel,
  getNextExcelContentDisplayMode,
  normalizeExcelColumnWidth,
} from './ExcelViewModel';
import type { ExcelColumnWidthMap, ExcelViewDisplayConfig, ExcelViewProps } from './types';

export function ExcelView({
  items,
  goals = [],
  fields,
  availableFields,
  excelConfig,
  onFieldsChange,
  onExcelConfigChange,
  onCellCommit,
  onOpenRecordOrigin,
  messageRenderPort,
}: ExcelViewProps) {
  const renderModel = useMemo(() => buildExcelViewRenderModel({
    items,
    goals,
    fields,
    availableFields,
    excelConfig,
  }), [availableFields, excelConfig, fields, goals, items]);

  const editing = useExcelCellEditing({ onCellCommit });
  const resetTransientState = editing.resetTransientState;
  const [fieldConfigSaving, setFieldConfigSaving] = useState(false);
  const [fieldConfigError, setFieldConfigError] = useState<string | null>(null);
  const [excelConfigSaving, setExcelConfigSaving] = useState(false);
  const [localColumnWidths, setLocalColumnWidths] = useState<ExcelColumnWidthMap>(renderModel.persistedColumnWidths);
  const [localContentDisplayMode, setLocalContentDisplayMode] = useState(renderModel.persistedContentDisplayMode);

  const isFullMarkdownContent = localContentDisplayMode === 'fullMarkdown';
  const contentModeButtonTitle = buildExcelContentModeButtonTitle({
    hasContentColumn: renderModel.hasContentColumn,
    excelConfigSaving,
    isFullMarkdownContent,
  });

  useEffect(() => {
    resetTransientState();
  }, [renderModel.itemSignature, resetTransientState]);

  useEffect(() => {
    setLocalColumnWidths(renderModel.persistedColumnWidths);
  }, [renderModel.persistedColumnWidths]);

  useEffect(() => {
    setLocalContentDisplayMode(renderModel.persistedContentDisplayMode);
  }, [renderModel.persistedContentDisplayMode]);

  const handleFieldsChange = useCallback(async (nextFields: string[]) => {
    if (!onFieldsChange || fieldConfigSaving) return;
    const normalizedNextFields = normalizeDisplayFields(nextFields, {
      availableFields: renderModel.normalizedAvailableFields,
      includeUnknown: true,
      fallbackFields: renderModel.displayFields,
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
  }, [fieldConfigSaving, onFieldsChange, renderModel.displayFields, renderModel.normalizedAvailableFields]);

  const persistExcelConfig = useCallback(async (nextConfig: ExcelViewDisplayConfig, rollback?: () => void) => {
    if (!onExcelConfigChange) return;

    setExcelConfigSaving(true);
    try {
      await onExcelConfigChange(nextConfig);
    } catch (error) {
      diagnosticError('[ExcelView] 保存 Excel 视图配置失败', error);
      rollback?.();
    } finally {
      setExcelConfigSaving(false);
    }
  }, [onExcelConfigChange]);

  const handleColumnWidthDraftChange = useCallback((field: string, width: number) => {
    const nextWidth = normalizeExcelColumnWidth(width);
    setLocalColumnWidths(prev => ({ ...prev, [field]: nextWidth }));
  }, []);

  const handleColumnWidthCommit = useCallback(async (field: string, width: number) => {
    const nextWidth = normalizeExcelColumnWidth(width);
    const nextColumnWidths = { ...localColumnWidths, [field]: nextWidth };

    setLocalColumnWidths(nextColumnWidths);
    await persistExcelConfig({
      ...(excelConfig || {}),
      columnWidths: nextColumnWidths,
      contentDisplayMode: localContentDisplayMode,
    }, () => setLocalColumnWidths(renderModel.persistedColumnWidths));
  }, [excelConfig, localColumnWidths, localContentDisplayMode, persistExcelConfig, renderModel.persistedColumnWidths]);

  const handleContentDisplayToggle = useCallback(async () => {
    if (!renderModel.hasContentColumn || excelConfigSaving) return;
    const nextMode = getNextExcelContentDisplayMode(localContentDisplayMode);
    const previousMode = localContentDisplayMode;
    setLocalContentDisplayMode(nextMode);

    await persistExcelConfig({
      ...(excelConfig || {}),
      columnWidths: localColumnWidths,
      contentDisplayMode: nextMode,
    }, () => setLocalContentDisplayMode(previousMode));
  }, [excelConfig, excelConfigSaving, localColumnWidths, localContentDisplayMode, persistExcelConfig, renderModel.hasContentColumn]);

  return (
    <div
      class="excel-view-shell"
      data-inline-edit={onCellCommit ? 'enabled' : 'disabled'}
      data-column-config={onFieldsChange ? 'enabled' : 'disabled'}
      data-excel-config-saving={excelConfigSaving ? 'true' : 'false'}
      data-content-display-mode={localContentDisplayMode}
      {...getObsidianEventBoundaryProps()}
    >
      <ExcelViewToolbar
        editableColumnCount={renderModel.editableColumnCount}
        readonlyColumnCount={renderModel.readonlyColumnCount}
        displayFields={renderModel.displayFields}
        availableFields={renderModel.normalizedAvailableFields}
        fieldConfigSaving={fieldConfigSaving}
        fieldConfigError={fieldConfigError}
        fieldsChangeDisabled={!onFieldsChange}
        excelConfigSaving={excelConfigSaving}
        contentDisplayMode={localContentDisplayMode}
        hasContentColumn={renderModel.hasContentColumn}
        contentModeButtonTitle={contentModeButtonTitle}
        onFieldsChange={handleFieldsChange}
        onContentDisplayToggle={handleContentDisplayToggle}
      />
      <ExcelGrid
        items={renderModel.orderedItems}
        columns={renderModel.columns}
        selectedCellKey={editing.selectedCellKey}
        editingCellKey={editing.editingCellKey}
        pendingCellKeys={editing.pendingCellKeys}
        savedCellKeys={editing.savedCellKeys}
        cellErrors={editing.cellErrors}
        valueOverrides={editing.valueOverrides}
        canCommitCells={!!onCellCommit}
        columnWidths={localColumnWidths}
        contentDisplayMode={localContentDisplayMode}
        messageRenderPort={messageRenderPort}
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
        onOpenRecordOrigin={onOpenRecordOrigin}
      />
    </div>
  );
}
