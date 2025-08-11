// src/features/dashboard/settings/ModuleEditors/registry.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { TableViewEditor, DEFAULT_CONFIG as TableViewDefault } from './TableViewEditor';
import { BlockViewEditor, DEFAULT_CONFIG as BlockViewDefault } from './BlockViewEditor';
import { ExcelViewEditor, DEFAULT_CONFIG as ExcelViewDefault } from './ExcelViewEditor';
import { TimelineViewEditor, DEFAULT_CONFIG as TimelineViewDefault } from './TimelineViewEditor';
import type { ViewName } from '@core/domain/schema';

// [REFACTOR] ViewKind is now derived from the domain-level ViewName
export type ViewKind = ViewName;

export interface ViewEditorProps {
  value: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
  fieldOptions: string[];
}

// [REFACTOR] The registry is now the Single Source of Truth for both the editor component and its default configuration.
export const VIEW_INFO_REGISTRY = {
  TableView:    { component: TableViewEditor,    defaultConfig: TableViewDefault },
  BlockView:    { component: BlockViewEditor,    defaultConfig: BlockViewDefault },
  ExcelView:    { component: ExcelViewEditor,    defaultConfig: ExcelViewDefault },
  TimelineView: { component: TimelineViewEditor, defaultConfig: TimelineViewDefault },
} as const;

// For convenience, we can export the editors map and defaults map separately if needed elsewhere.
export const VIEW_EDITORS = Object.fromEntries(
    Object.entries(VIEW_INFO_REGISTRY).map(([k, v]) => [k, v.component])
) as Record<ViewKind, (p: ViewEditorProps) => any>;

export const VIEW_DEFAULT_CONFIGS = Object.fromEntries(
    Object.entries(VIEW_INFO_REGISTRY).map(([k,v]) => [k, v.defaultConfig])
) as Record<ViewKind, any>;