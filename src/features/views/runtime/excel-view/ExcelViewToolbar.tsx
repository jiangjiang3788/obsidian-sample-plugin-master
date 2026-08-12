/** @jsxImportSource preact */
import { h } from 'preact';
import { getFieldCategoryLabel, getFieldLabel } from '@core/fields/public';
import { ExcelColumnToolbar } from './ExcelColumnToolbar';
import type { ExcelContentDisplayMode, ExcelDisplayFieldsChangeHandler } from './types';

export interface ExcelViewToolbarProps {
  editableColumnCount: number;
  readonlyColumnCount: number;
  displayFields: string[];
  availableFields: string[];
  fieldConfigSaving: boolean;
  fieldConfigError: string | null;
  fieldsChangeDisabled?: boolean;
  excelConfigSaving: boolean;
  contentDisplayMode: ExcelContentDisplayMode;
  hasContentColumn: boolean;
  contentModeButtonTitle: string;
  onFieldsChange?: ExcelDisplayFieldsChangeHandler;
  onContentDisplayToggle: () => void;
}

export function ExcelViewToolbar({
  editableColumnCount,
  readonlyColumnCount,
  displayFields,
  availableFields,
  fieldConfigSaving,
  fieldConfigError,
  fieldsChangeDisabled,
  excelConfigSaving,
  contentDisplayMode,
  hasContentColumn,
  contentModeButtonTitle,
  onFieldsChange,
  onContentDisplayToggle,
}: ExcelViewToolbarProps) {
  const isFullMarkdownContent = contentDisplayMode === 'fullMarkdown';
  return (
    <>
      <div class="excel-view-toolbar" aria-label="Excel 视图编辑说明">
        <span class="excel-view-legend-chip is-editable">可编辑 {editableColumnCount}</span>
        <span class="excel-view-legend-chip is-readonly">只读 {readonlyColumnCount}</span>
        <button
          type="button"
          class={`excel-view-content-mode-button ${isFullMarkdownContent ? 'is-active' : ''} ${excelConfigSaving ? 'is-saving' : ''}`}
          aria-pressed={isFullMarkdownContent ? 'true' : 'false'}
          title={contentModeButtonTitle}
          disabled={!hasContentColumn || excelConfigSaving}
          onClick={onContentDisplayToggle as any}
        >
          内容：{excelConfigSaving ? '保存中…' : isFullMarkdownContent ? '全文 Markdown' : '预览'}
        </button>
        <span class="excel-view-legend-note">单击选中；双击/Enter/F2 编辑；Ctrl/⌘+点击打开完整记录；方向键/Tab 导航；支持多行多列粘贴。</span>
      </div>
      <ExcelColumnToolbar
        fields={displayFields}
        availableFields={availableFields}
        saving={fieldConfigSaving}
        error={fieldConfigError}
        disabled={fieldsChangeDisabled}
        getFieldLabel={getFieldLabel}
        getFieldGroupLabel={getFieldCategoryLabel}
        onFieldsChange={onFieldsChange}
      />
    </>
  );
}
