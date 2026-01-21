// src/core/types/viewConfigs.ts
/**
 * View Configs Public Contract
 * ---------------------------------------------------------------
 * ✅ 视图默认配置 / 导出配置 属于跨 feature 可复用的稳定合同。
 *
 * 说明：实现仍然放在 core/config 下；这里作为对外“可见面”的显式 re-export。
 * 外部只能通过 @core/public（→ core/types）访问，禁止 deep import。
 */

export {
  STATISTICS_VIEW_DEFAULT_CONFIG,
  HEATMAP_VIEW_DEFAULT_CONFIG,
  TABLE_VIEW_DEFAULT_CONFIG,
  TIMELINE_VIEW_DEFAULT_CONFIG,
  BLOCK_VIEW_DEFAULT_CONFIG,
  EXCEL_VIEW_DEFAULT_CONFIG,
  EVENT_TIMELINE_VIEW_DEFAULT_CONFIG,
  BLOCK_EXPORT_DEFAULT_CONFIG,
  EVENT_TIMELINE_EXPORT_CONFIG,
} from '../config/viewConfigs';

// 保持历史别名（来自旧 heatmapViewConfig.ts）
export { HEATMAP_VIEW_DEFAULT_CONFIG as DEFAULT_HEATMAP_CONFIG } from '../config/viewConfigs';

export type {
  HeatmapViewConfig,
  TableViewConfig,
  CategoryConfig,
  TimelineViewConfig,
  BlockViewConfig,
  ExcelViewConfig,
  EventTimelineViewConfig,
  FieldRenderConfig,
  ExportViewConfig,
} from '../config/viewConfigs';
