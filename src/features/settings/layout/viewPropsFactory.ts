import type { Item, ViewInstance } from '@core/types/public';
import type { MessageRenderPort } from '@core/ports/public';
import type { CloseStatisticsPopoverHandler, OpenStatisticsPopoverHandler, TimerController } from '@shared/types/public';
import type { ViewRenderModels } from '@/features/settings/viewModels/viewModelRegistry';
import type { ViewRuntimeHandlers } from './useViewRuntimeHandlers';

export interface BuildViewPropsParams {
  viewInstance: ViewInstance;
  viewItems: Item[];
  dateRange: [Date, Date];
  layoutView: string;
  useFieldGranularity: boolean;
  excelAvailableFields: string[];
  onMarkDone: (id: string) => void;
  handlers: ViewRuntimeHandlers;
  onOpenStatisticsPopover: OpenStatisticsPopoverHandler;
  onCloseStatisticsPopover: CloseStatisticsPopoverHandler;
  timerService: TimerController;
  timers: any[];
  allThemes: any[];
  inputSettings: any;
  goals?: any[];
  selectedLayoutCategories: string[];
  categoryColors: Record<string, string>;
  messageRenderPort?: MessageRenderPort;
  renderModels: ViewRenderModels;
}

export function buildViewProps({
  viewInstance,
  viewItems,
  dateRange,
  layoutView,
  useFieldGranularity,
  excelAvailableFields,
  onMarkDone,
  handlers,
  onOpenStatisticsPopover,
  onCloseStatisticsPopover,
  timerService,
  timers,
  allThemes,
  inputSettings,
  goals = [],
  selectedLayoutCategories,
  categoryColors,
  messageRenderPort,
  renderModels,
}: BuildViewPropsParams): Record<string, unknown> {
  const viewType = viewInstance.viewType;

  return {
    items: viewItems,
    dateRange,
    module: viewInstance,
    currentView: layoutView,
    useFieldGranularity,
    ...viewInstance.viewConfig,
    groupField: viewInstance.group,
    groupFields: viewInstance.groupFields,
    fields: viewInstance.fields,
    availableFields: viewType === 'ExcelView' ? excelAvailableFields : undefined,
    excelConfig: viewType === 'ExcelView' ? viewInstance.viewConfig?.excel : undefined,
    onFieldsChange: viewType === 'ExcelView' ? handlers.onExcelFieldsChange : undefined,
    onExcelConfigChange: viewType === 'ExcelView' ? handlers.onExcelConfigChange : undefined,
    onMarkDone,
    onUpdateTaskTime: handlers.onUpdateTaskTime,
    // Statistics / Progress 只负责展示；新增数据统一走 QuickInput 主入口，不从视图 popover 创建。
    onQuickCreate: undefined,
    onOpenStatisticsPopover: viewType === 'StatisticsView' ? onOpenStatisticsPopover : undefined,
    onCloseStatisticsPopover: viewType === 'StatisticsView' ? onCloseStatisticsPopover : undefined,
    categoryColors: viewType === 'StatisticsView' ? categoryColors : undefined,
    onCategoryColorsChange: viewType === 'StatisticsView' ? handlers.onCategoryColorsChange : undefined,
    onOpenRecord: handlers.onOpenRecord,
    onOpenRecordOrigin: handlers.onOpenRecordOrigin,
    resolveResourcePath: handlers.resolveResourcePath,
    onNotice: handlers.onNotice,
    onCreateFromTimeline: viewType === 'TimelineView' ? handlers.onCreateFromTimeline : undefined,
    onOpenHeatmapCreate: viewType === 'HeatmapView' ? handlers.onOpenHeatmapCreate : undefined,
    onOpenCheckinManager: viewType === 'HeatmapView' ? handlers.onOpenCheckinManager : undefined,
    onCellCommit: viewType === 'ExcelView' ? handlers.onExcelCellCommit : undefined,
    timerService,
    timers,
    allThemes,
    inputSettings,
    goals,
    selectedCategories: selectedLayoutCategories,
    messageRenderPort,
    ...renderModels,
  };
}
