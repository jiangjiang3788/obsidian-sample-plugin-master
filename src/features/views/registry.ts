import type { ComponentType } from 'preact';
import type { ViewName } from '@core/types/public';
import {
  TableView,
  BlockView,
  ExcelView,
  StatisticsView,
  TimelineView,
  EventTimelineView,
  HeatmapView,
  ProgressView,
  EnergyView,
} from './runtime';

/**
 * Runtime binding only. View metadata belongs to core VIEW_DEFINITIONS.
 * This map must stay exhaustive; the convergence gate checks key parity.
 */
export const VIEW_RUNTIME_BINDINGS = {
  TableView,
  BlockView,
  TimelineView,
  EventTimelineView,
  ExcelView,
  StatisticsView,
  HeatmapView,
  ProgressView,
  EnergyView,
} satisfies Record<ViewName, ComponentType<any>>;

export function getViewRuntimeComponent(viewType: ViewName): ComponentType<any> {
  return VIEW_RUNTIME_BINDINGS[viewType];
}
