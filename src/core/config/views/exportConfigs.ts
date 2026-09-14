import type { ExportViewConfig } from './types';

/**
 * View 只声明结构策略，字段语义统一由 Record Export Profile 决定。
 * 这组配置故意保持很薄，避免新增 View 时复制整套 Markdown 字段配置。
 */
export const BLOCK_EXPORT_DEFAULT_CONFIG: ExportViewConfig = {
  strategy: 'records',
};

export const TABLE_EXPORT_CONFIG: ExportViewConfig = {
  strategy: 'records',
};

export const EXCEL_EXPORT_CONFIG: ExportViewConfig = {
  strategy: 'table',
};

export const TIMELINE_EXPORT_CONFIG: ExportViewConfig = {
  strategy: 'timeline',
  taskSessionMode: 'expanded',
  taskSessionScope: 'range',
};

export const EVENT_TIMELINE_EXPORT_CONFIG: ExportViewConfig = {
  strategy: 'event-timeline',
};

export const STATISTICS_EXPORT_CONFIG: ExportViewConfig = {
  strategy: 'statistics',
};

export const HEATMAP_EXPORT_CONFIG: ExportViewConfig = {
  strategy: 'heatmap',
};

export const PROGRESS_EXPORT_CONFIG: ExportViewConfig = {
  strategy: 'progress',
};

export const ENERGY_EXPORT_CONFIG: ExportViewConfig = {
  strategy: 'energy',
};

export const EISENHOWER_EXPORT_CONFIG: ExportViewConfig = {
  strategy: 'eisenhower',
};
