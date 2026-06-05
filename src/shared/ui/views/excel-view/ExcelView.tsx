/** @jsxImportSource preact */
import { h } from 'preact';
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { diagnosticError } from '../../../utils/diagnosticConsole';
import { getAllFields, getFieldCategoryLabel, getFieldLabel, normalizeDisplayFields } from '@core/public';
import { ExcelColumnToolbar } from './ExcelColumnToolbar';
import { ExcelGrid } from './ExcelGrid';
import { buildExcelColumns } from './value';
import { useExcelCellEditing } from './useExcelCellEditing';
import { getObsidianEventBoundaryProps } from '../../events/obsidianEventBoundary';
import type { ExcelColumnWidthMap, ExcelContentDisplayMode, ExcelViewDisplayConfig, ExcelViewProps } from './types';

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

function normalizeContentDisplayMode(mode?: string): ExcelContentDisplayMode {
  return mode === 'fullMarkdown' ? 'fullMarkdown' : 'previewText';
}

function getNextContentDisplayMode(mode: ExcelContentDisplayMode): ExcelContentDisplayMode {
  return mode === 'fullMarkdown' ? 'previewText' : 'fullMarkdown';
}

export function ExcelView({
  items,
  fields,
  availableFields,
  excelConfig,
  onFieldsChange,
  onExcelConfigChange,
  onCellCommit,
  onOpenRecord,
  messageRenderPort,
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
  const persistedContentDisplayMode = useMemo(
    () => normalizeContentDisplayMode(excelConfig?.contentDisplayMode),
    [excelConfig?.contentDisplayMode],
  );
  const editing = useExcelCellEditing({ onCellCommit });
  const resetTransientState = editing.resetTransientState;
  const editableColumnCount = columns.filter(column => column.editable).length;
  const readonlyColumnCount = Math.max(0, columns.length - editableColumnCount);
  const [fieldConfigSaving, setFieldConfigSaving] = useState(false);
  const [fieldConfigError, setFieldConfigError] = useState<string | null>(null);
  const [excelConfigSaving, setExcelConfigSaving] = useState(false);
  const [localColumnWidths, setLocalColumnWidths] = useState<ExcelColumnWidthMap>(persistedColumnWidths);
  const [localContentDisplayMode, setLocalContentDisplayMode] = useState<ExcelContentDisplayMode>(persistedContentDisplayMode);
  const isFullMarkdownContent = localContentDisplayMode === 'fullMarkdown';
  const hasContentColumn = useMemo(() => columns.some(column => column.canonicalField === 'content'), [columns]);
  const contentModeButtonTitle = !hasContentColumn
    ? '当前表格未显示内容字段，请先在字段栏添加 content/内容字段'
    : excelConfigSaving
      ? '正在保存 Excel 视图配置'
      : isFullMarkdownContent
        ? '当前：内容字段显示完整 Markdown；点击切回短文本预览'
        : '当前：内容字段短文本预览；点击显示完整 Markdown';

  useEffect(() => {
    resetTransientState();
  }, [itemSignature, resetTransientState]);

  useEffect(() => {
    setLocalColumnWidths(persistedColumnWidths);
  }, [persistedColumnWidths]);

  useEffect(() => {
    setLocalContentDisplayMode(persistedContentDisplayMode);
  }, [persistedContentDisplayMode]);

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
    await persistExcelConfig({
      ...(excelConfig || {}),
      columnWidths: nextColumnWidths,
      contentDisplayMode: localContentDisplayMode,
    }, () => setLocalColumnWidths(persistedColumnWidths));
  }, [excelConfig, localColumnWidths, localContentDisplayMode, persistedColumnWidths, persistExcelConfig]);

  const handleContentDisplayToggle = useCallback(async () => {
    if (!hasContentColumn || excelConfigSaving) return;
    const nextMode = getNextContentDisplayMode(localContentDisplayMode);
    const previousMode = localContentDisplayMode;
    setLocalContentDisplayMode(nextMode);

    await persistExcelConfig({
      ...(excelConfig || {}),
      columnWidths: localColumnWidths,
      contentDisplayMode: nextMode,
    }, () => setLocalContentDisplayMode(previousMode));
  }, [excelConfig, excelConfigSaving, hasContentColumn, localColumnWidths, localContentDisplayMode, persistExcelConfig]);

  return (
    <div
      class="excel-view-shell"
      data-inline-edit={onCellCommit ? 'enabled' : 'disabled'}
      data-column-config={onFieldsChange ? 'enabled' : 'disabled'}
      data-excel-config-saving={excelConfigSaving ? 'true' : 'false'}
      data-content-display-mode={localContentDisplayMode}
      {...getObsidianEventBoundaryProps()}
    >
      <div class="excel-view-toolbar" aria-label="Excel 视图编辑说明">
        <span class="excel-view-legend-chip is-editable">可编辑 {editableColumnCount}</span>
        <span class="excel-view-legend-chip is-readonly">只读 {readonlyColumnCount}</span>
        <button
          type="button"
          class={`excel-view-content-mode-button ${isFullMarkdownContent ? 'is-active' : ''} ${excelConfigSaving ? 'is-saving' : ''}`}
          aria-pressed={isFullMarkdownContent ? 'true' : 'false'}
          title={contentModeButtonTitle}
          disabled={!hasContentColumn || excelConfigSaving}
          onClick={handleContentDisplayToggle as any}
        >
          内容：{excelConfigSaving ? '保存中…' : isFullMarkdownContent ? '全文 Markdown' : '预览'}
        </button>
        <span class="excel-view-legend-note">双击/Enter/F2 编辑；方向键/Tab 导航；支持多行多列粘贴；内容字段可切换预览或全文 Markdown。</span>
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
        onOpenRecord={onOpenRecord}
      />
    </div>
  );
}
