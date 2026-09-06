/** @jsxImportSource preact */
import type { ViewName } from '@core/types/public';
import { TableViewEditor } from './TableViewEditor';
import { BlockViewEditor } from './BlockViewEditor';
import { ExcelViewEditor } from './ExcelViewEditor';
import { TimelineViewEditor } from './TimelineViewEditor';
import { EventTimelineViewEditor } from './EventTimelineViewEditor';
import { StatisticsViewEditor } from './StatisticsViewEditor';
import { HeatmapViewEditor } from './HeatmapViewEditor';
import { ProgressViewEditor } from './ProgressViewEditor';
import { EnergyViewEditor } from './EnergyViewEditor';
import { EisenhowerViewEditor } from './EisenhowerViewEditor';
import type { ViewEditorProps } from './ViewEditorProps';

export type ViewKind = ViewName;
export type { ViewEditorProps } from './ViewEditorProps';

/**
 * UI binding only. View names/defaults/layout/capabilities live in the core
 * VIEW_DEFINITIONS registry; this map only attaches settings components.
 */
export const VIEW_EDITORS = {
  TableView: TableViewEditor,
  BlockView: BlockViewEditor,
  ExcelView: ExcelViewEditor,
  TimelineView: TimelineViewEditor,
  EventTimelineView: EventTimelineViewEditor,
  StatisticsView: StatisticsViewEditor,
  HeatmapView: HeatmapViewEditor,
  ProgressView: ProgressViewEditor,
  EnergyView: EnergyViewEditor,
  EisenhowerView: EisenhowerViewEditor,
} satisfies Record<ViewName, (p: ViewEditorProps) => any>;

export function getViewEditorComponent(viewType: ViewName) {
  return VIEW_EDITORS[viewType];
}
