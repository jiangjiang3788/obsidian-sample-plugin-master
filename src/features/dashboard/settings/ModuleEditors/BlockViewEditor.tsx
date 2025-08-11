// src/features/dashboard/settings/ModuleEditors/BlockViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';

/**
 * @fileoverview BlockView 的设置编辑器。
 * 新增: 导出该视图的默认配置，作为单一真源。
 */

// [REFACTOR] 导出默认配置
export const DEFAULT_CONFIG = {
  view: 'BlockView' as const,
  title: '块视图',
  collapsed: false,
  filters: [],
  sort: [],
  fields: [],
  group: 'categoryKey',
};

export function BlockViewEditor() {
  return (
    <div class="view-meta" style="--c:#22aa66">
      <span class="dot"></span>块视图：主要使用“分组字段/显示字段/过滤/排序”
    </div>
  );
}