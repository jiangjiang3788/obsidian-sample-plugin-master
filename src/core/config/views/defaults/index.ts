import type { ViewDefaultConfigMap } from '../types';

import { BLOCK_VIEW_DEFAULT_CONFIG } from './block';
import { EVENT_TIMELINE_VIEW_DEFAULT_CONFIG } from './eventTimeline';
import { EXCEL_VIEW_DEFAULT_CONFIG } from './excel';
import { HEATMAP_VIEW_DEFAULT_CONFIG } from './heatmap';
import { PROGRESS_VIEW_DEFAULT_CONFIG } from './progress';
import { STATISTICS_VIEW_DEFAULT_CONFIG } from './statistics';
import { TABLE_VIEW_DEFAULT_CONFIG } from './table';
import { TASK_EXECUTION_VIEW_DEFAULT_CONFIG } from './taskExecution';
import { TIMELINE_VIEW_DEFAULT_CONFIG } from './timeline';

export { BLOCK_VIEW_DEFAULT_CONFIG } from './block';
export { EVENT_TIMELINE_VIEW_DEFAULT_CONFIG } from './eventTimeline';
export { EXCEL_VIEW_DEFAULT_CONFIG } from './excel';
export { HEATMAP_VIEW_DEFAULT_CONFIG } from './heatmap';
export { PROGRESS_VIEW_DEFAULT_CONFIG } from './progress';
export { STATISTICS_VIEW_DEFAULT_CONFIG } from './statistics';
export { TABLE_VIEW_DEFAULT_CONFIG } from './table';
export { TASK_EXECUTION_VIEW_DEFAULT_CONFIG } from './taskExecution';
export { TIMELINE_VIEW_DEFAULT_CONFIG } from './timeline';

/**
 * 视图默认配置映射表。
 *
 * 供 store/slices 使用，避免 store 层直接依赖 features/settings/registry。
 */
export const VIEW_DEFAULT_CONFIGS: ViewDefaultConfigMap = {
  TableView: TABLE_VIEW_DEFAULT_CONFIG,
  BlockView: BLOCK_VIEW_DEFAULT_CONFIG,
  ExcelView: EXCEL_VIEW_DEFAULT_CONFIG,
  TimelineView: TIMELINE_VIEW_DEFAULT_CONFIG,
  EventTimelineView: EVENT_TIMELINE_VIEW_DEFAULT_CONFIG,
  StatisticsView: STATISTICS_VIEW_DEFAULT_CONFIG,
  HeatmapView: HEATMAP_VIEW_DEFAULT_CONFIG,
  ProgressView: PROGRESS_VIEW_DEFAULT_CONFIG,
  TaskExecutionView: TASK_EXECUTION_VIEW_DEFAULT_CONFIG,
};
