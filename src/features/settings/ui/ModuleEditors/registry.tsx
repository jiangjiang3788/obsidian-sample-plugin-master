// src/features/settings/ui/ModuleEditors/registry.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { TableViewEditor } from './TableViewEditor';
import { BlockViewEditor } from './BlockViewEditor';
import { ExcelViewEditor } from './ExcelViewEditor';
import { TimelineViewEditor } from './TimelineViewEditor'; // 1. 导入新的编辑器

// 2. 在类型中添加 'TimelineView'
export type ViewKind = 'TableView' | 'BlockView' | 'ExcelView' | 'ListView' | 'TimelineView';

export interface ViewEditorProps {
  value: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
  fieldOptions: string[];
}

// 3. 在注册表中添加新的编辑器
export const VIEW_EDITORS: Record<ViewKind, (p: ViewEditorProps) => any> = {
  TableView: TableViewEditor,
  BlockView: BlockViewEditor,
  ExcelView: ExcelViewEditor,
  TimelineView: TimelineViewEditor, // 添加这一行
};