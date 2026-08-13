// src/features/dashboard/settings/ModuleEditors/ExcelViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { EXCEL_VIEW_DEFAULT_CONFIG } from '@core/view/public';
import { ReadonlyViewEditorNotice } from './settingsEditorUi';

// 重新导出以保持兼容性
export { EXCEL_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/view/public';

export function ExcelViewEditor() {
  return (
    <ReadonlyViewEditorNotice
      title="数据表格（ExcelView）"
    />
  );
}
