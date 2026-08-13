// src/features/dashboard/settings/ModuleEditors/BlockViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { BLOCK_VIEW_DEFAULT_CONFIG } from '@core/view/public';
import { ReadonlyViewEditorNotice } from './settingsEditorUi';

// 重新导出以保持兼容性
export { BLOCK_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/view/public';

export function BlockViewEditor() {
  return (
    <ReadonlyViewEditorNotice
      title="块视图（BlockView）"
    />
  );
}
