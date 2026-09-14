import {
  BLOCK_VIEW_DEFAULT_CONFIG,
  ENERGY_VIEW_DEFAULT_CONFIG,
  EISENHOWER_VIEW_DEFAULT_CONFIG,
  EVENT_TIMELINE_VIEW_DEFAULT_CONFIG,
  EXCEL_VIEW_DEFAULT_CONFIG,
  HEATMAP_VIEW_DEFAULT_CONFIG,
  PROGRESS_VIEW_DEFAULT_CONFIG,
  STATISTICS_VIEW_DEFAULT_CONFIG,
  TABLE_VIEW_DEFAULT_CONFIG,
  TIMELINE_VIEW_DEFAULT_CONFIG,
} from './defaults';
import {
  BLOCK_EXPORT_DEFAULT_CONFIG,
  EVENT_TIMELINE_EXPORT_CONFIG,
  EXCEL_EXPORT_CONFIG,
  HEATMAP_EXPORT_CONFIG,
  STATISTICS_EXPORT_CONFIG,
  TABLE_EXPORT_CONFIG,
  TIMELINE_EXPORT_CONFIG,
  PROGRESS_EXPORT_CONFIG,
  ENERGY_EXPORT_CONFIG,
  EISENHOWER_EXPORT_CONFIG,
} from './exportConfigs';
import type { ExportViewConfig, ViewDefaultConfig } from './types';

export interface ViewLayoutHints {
  freeformWidth: number;
  freeformHeight: number;
  deferredMinHeight: number;
}

export interface ViewCapabilities {
  /** Whether the module header exposes a direct create action. */
  headerCreate: boolean;
  /** Whether the module header exposes Markdown export. */
  export: boolean;
}

export interface ViewDefinition {
  label: string;
  defaultConfig: ViewDefaultConfig;
  layout: ViewLayoutHints;
  capabilities: ViewCapabilities;
  exportConfig?: ExportViewConfig;
}

/**
 * Canonical built-in view catalog.
 *
 * Adding a normal built-in view starts here. Runtime/editor bindings are checked
 * against this registry by the view-registry convergence gate, so no additional
 * option/default/layout/create/export allowlists should be introduced elsewhere.
 */
export const VIEW_DEFINITIONS = {
  BlockView: {
    label: '块视图',
    defaultConfig: BLOCK_VIEW_DEFAULT_CONFIG,
    layout: { freeformWidth: 480, freeformHeight: 340, deferredMinHeight: 420 },
    capabilities: { headerCreate: false, export: true },
    exportConfig: BLOCK_EXPORT_DEFAULT_CONFIG,
  },
  TableView: {
    label: '表格',
    defaultConfig: TABLE_VIEW_DEFAULT_CONFIG,
    layout: { freeformWidth: 680, freeformHeight: 420, deferredMinHeight: 420 },
    capabilities: { headerCreate: false, export: true },
    exportConfig: TABLE_EXPORT_CONFIG,
  },
  ExcelView: {
    label: '数据表格',
    defaultConfig: EXCEL_VIEW_DEFAULT_CONFIG,
    layout: { freeformWidth: 760, freeformHeight: 460, deferredMinHeight: 420 },
    capabilities: { headerCreate: false, export: true },
    exportConfig: EXCEL_EXPORT_CONFIG,
  },
  TimelineView: {
    label: '时间轴',
    defaultConfig: TIMELINE_VIEW_DEFAULT_CONFIG,
    layout: { freeformWidth: 680, freeformHeight: 420, deferredMinHeight: 520 },
    capabilities: { headerCreate: true, export: true },
    exportConfig: TIMELINE_EXPORT_CONFIG,
  },
  StatisticsView: {
    label: '统计',
    defaultConfig: STATISTICS_VIEW_DEFAULT_CONFIG,
    layout: { freeformWidth: 440, freeformHeight: 340, deferredMinHeight: 320 },
    capabilities: { headerCreate: true, export: true },
    exportConfig: STATISTICS_EXPORT_CONFIG,
  },
  HeatmapView: {
    label: '打卡',
    defaultConfig: HEATMAP_VIEW_DEFAULT_CONFIG,
    layout: { freeformWidth: 520, freeformHeight: 360, deferredMinHeight: 360 },
    capabilities: { headerCreate: true, export: true },
    exportConfig: HEATMAP_EXPORT_CONFIG,
  },
  EventTimelineView: {
    label: '事件时间线',
    defaultConfig: EVENT_TIMELINE_VIEW_DEFAULT_CONFIG,
    layout: { freeformWidth: 680, freeformHeight: 420, deferredMinHeight: 420 },
    capabilities: { headerCreate: false, export: true },
    exportConfig: EVENT_TIMELINE_EXPORT_CONFIG,
  },
  ProgressView: {
    label: '成长',
    defaultConfig: PROGRESS_VIEW_DEFAULT_CONFIG,
    layout: { freeformWidth: 480, freeformHeight: 360, deferredMinHeight: 360 },
    capabilities: { headerCreate: false, export: true },
    exportConfig: PROGRESS_EXPORT_CONFIG,
  },
  EnergyView: {
    label: '精力',
    defaultConfig: ENERGY_VIEW_DEFAULT_CONFIG,
    layout: { freeformWidth: 720, freeformHeight: 620, deferredMinHeight: 440 },
    capabilities: { headerCreate: true, export: true },
    exportConfig: ENERGY_EXPORT_CONFIG,
  },
  EisenhowerView: {
    label: '四象限',
    defaultConfig: EISENHOWER_VIEW_DEFAULT_CONFIG,
    layout: { freeformWidth: 760, freeformHeight: 560, deferredMinHeight: 480 },
    capabilities: { headerCreate: false, export: true },
    exportConfig: EISENHOWER_EXPORT_CONFIG,
  },
} as const satisfies Record<string, ViewDefinition>;

export type RegisteredViewName = keyof typeof VIEW_DEFINITIONS;

export const VIEW_OPTIONS = Object.freeze(
  Object.keys(VIEW_DEFINITIONS) as RegisteredViewName[],
);

export const VIEW_DEFAULT_CONFIGS = Object.freeze(
  Object.fromEntries(
    VIEW_OPTIONS.map((viewType) => [viewType, VIEW_DEFINITIONS[viewType].defaultConfig]),
  ) as Record<RegisteredViewName, ViewDefaultConfig>,
);

export function isRegisteredViewName(value: string): value is RegisteredViewName {
  return Object.prototype.hasOwnProperty.call(VIEW_DEFINITIONS, value);
}

export function getViewDefinition(viewType: string): ViewDefinition | undefined {
  if (!isRegisteredViewName(viewType)) return undefined;
  return VIEW_DEFINITIONS[viewType];
}

export function getViewLabel(viewType: string): string {
  const fallback = viewType.replace(/View$/, '') || viewType;
  return getViewDefinition(viewType)?.label ?? fallback;
}

export function getViewDefaultConfig(viewType: string): ViewDefaultConfig | undefined {
  return getViewDefinition(viewType)?.defaultConfig;
}

export function getViewExportConfig(viewType: string): ExportViewConfig | undefined {
  return getViewDefinition(viewType)?.exportConfig;
}

export function viewHasCapability(viewType: string, capability: keyof ViewCapabilities): boolean {
  return getViewDefinition(viewType)?.capabilities[capability] === true;
}
