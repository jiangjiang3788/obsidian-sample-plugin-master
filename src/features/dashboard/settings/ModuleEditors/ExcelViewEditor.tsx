// src/features/dashboard/settings/ModuleEditors/ExcelViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';

/**
 * @fileoverview ExcelView 的设置编辑器。
 * 新增: 导出该视图的默认配置，作为单一真源。
 */

// [REFACTOR] 导出默认配置
export const DEFAULT_CONFIG = {
  view: 'ExcelView' as const,
  title: '数据表格',
  collapsed: false,
  filters: [],
  sort: [],
};

export function ExcelViewEditor() {
  return (
    <div class="view-meta" style="--c:#7a5cff">
      <span class="dot"></span>Excel 视图：常用于导出，配合“显示字段/过滤/排序”
    </div>
  );
}