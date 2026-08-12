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

export const VIEW_REGISTRY: Record<ViewName, ComponentType<any>> = {
  TableView,
  BlockView,
  TimelineView,
  EventTimelineView,
  ExcelView,
  StatisticsView,
  HeatmapView,
  ProgressView,
  EnergyView,
} as const;

export const DashboardViewComponents = VIEW_REGISTRY;
