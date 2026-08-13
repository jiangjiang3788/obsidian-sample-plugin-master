/** @jsxImportSource preact */
import { h } from 'preact';
import { getFieldCategoryLabel, getFieldLabel } from '@core/fields/public';
import { ThinkButton } from '@shared/ui/public';
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
      <div class="excel-view-toolbar" aria-label="Excel 视图工具栏">
        <span class="excel-view-legend-item is-editable">可编辑 {editableColumnCount}</span>
        <span class="excel-view-legend-separator" aria-hidden="true">|</span>
        <span class="excel-view-legend-item is-readonly">只读 {readonlyColumnCount}</span>
        <ThinkButton
          size="sm"
          variant="secondary"
          className="excel-view-content-mode-button"
          aria-pressed={isFullMarkdownContent ? 'true' : 'false'}
          title={contentModeButtonTitle}
          disabled={!hasContentColumn || excelConfigSaving}
          loading={excelConfigSaving}
          onClick={onContentDisplayToggle as any}
        >
          内容：{isFullMarkdownContent ? '全文' : '预览'}
        </ThinkButton>
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
