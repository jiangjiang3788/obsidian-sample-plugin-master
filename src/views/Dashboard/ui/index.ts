// src/features/dashboard/ui/index.ts
import { TableView } from './TableView';
import { BlockView } from './BlockView';
import { ExcelView } from './ExcelView';
import { StatisticsView } from './StatisticsView';
import { TimelineView } from './TimelineView';
import { HeatmapView } from './HeatmapView'; // [NEW] Import HeatmapView
import type { ComponentType } from 'preact';

// [NEW] Export ThemeFilter component
export { ThemeFilter } from './ThemeFilter';

// [REFACTOR] Import the authoritative ViewName and VIEW_OPTIONS from the domain layer.
import type { ViewName } from '@core/types/domain/schema';
import { VIEW_OPTIONS as DOMAIN_VIEW_OPTIONS } from '@core/types/domain/schema';


/* ------------------------------------------------------------------ */
/* 视图注册表                                                         */
/* ------------------------------------------------------------------ */
// [REFACTOR] This registry must now implement all views defined in the domain's ViewName type.
// The `Record<ViewName, any>` provides type-safety.
export const VIEW_REGISTRY: Record<ViewName, ComponentType<any>> = {
  TableView,
  BlockView,
  TimelineView,
  ExcelView,
  StatisticsView,
  HeatmapView, // [NEW] Register HeatmapView
} as const;

/** Dashboard.tsx 动态调用用这个常量 */
export const ViewComponents = VIEW_REGISTRY;

/** 所有可选视图名称（下拉框等用），从 Domain 层导入 */
export { ViewName, DOMAIN_VIEW_OPTIONS as VIEW_OPTIONS };
