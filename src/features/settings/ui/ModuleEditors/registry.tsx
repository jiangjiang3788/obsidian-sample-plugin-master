// src/features/settings/ui/ModuleEditors/registry.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { TableViewEditor } from './TableViewEditor';
import { BlockViewEditor } from './BlockViewEditor';
import { ExcelViewEditor } from './ExcelViewEditor';

export type ViewKind = 'TableView' | 'BlockView' | 'ExcelView';

export interface ViewEditorProps {
  value: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
  fieldOptions: string[];
}

export const VIEW_EDITORS: Record<ViewKind, (p: ViewEditorProps) => any> = {
  TableView: TableViewEditor,
  BlockView: BlockViewEditor,
  ExcelView: ExcelViewEditor,
};