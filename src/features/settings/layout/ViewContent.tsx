// src/features/settings/layout/ViewContent.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo } from 'preact/hooks';
import type { ActionService, DataStore, FilterRule, InputSettings, Item, ViewInstance } from '@core/public';
import { getAllFields, getCategoryValuesFromFilters } from '@core/public';
import { DashboardViewComponents as ViewComponents } from '@features/settings';
import { selectCategoryColors, useMessageRenderPort, useSelector } from '@/app/public';
import type { TimerController } from '@shared/public';
import { useViewData } from '@/features/settings/useViewData';
import { buildViewRenderModels } from '@/features/settings/viewModels/viewModelRegistry';
import { closeStatisticsPopover, openStatisticsPopover } from './statisticsPopoverBridge';
import { useViewRuntimeHandlers } from './useViewRuntimeHandlers';
import { buildViewProps } from './viewPropsFactory';

export interface ViewContentProps {
  viewInstance: ViewInstance;
  dataStore: DataStore;
  dateRange: [Date, Date];
  keyword: string;
  layoutView: string;
  isOverviewMode: boolean;
  useFieldGranularity: boolean;
  layoutFilters: FilterRule[];
  app: any;
  onMarkDone: (id: string) => void;
  actionService: ActionService;
  timerService: TimerController;
  timers: any[];
  allThemes: any[];
  allItems: Item[];
  inputSettings: InputSettings;
  onDataLoaded: (items: Item[]) => void;
}

// ViewContent 负责把统一筛选后的数据、运行时 handler 和特殊视图 renderModel 组装给 shared/ui。
export function ViewContent({
  viewInstance,
  dataStore,
  dateRange,
  keyword,
  layoutView,
  isOverviewMode,
  useFieldGranularity,
  layoutFilters,
  app,
  onMarkDone,
  actionService,
  timerService,
  timers,
  allThemes,
  allItems,
  inputSettings,
  onDataLoaded,
}: ViewContentProps) {
  const messageRenderPort = useMessageRenderPort();
  const categoryColors = useSelector(selectCategoryColors);

  const viewItems = useViewData({
    dataStore,
    sourceItems: allItems,
    viewInstance,
    dateRange,
    keyword,
    layoutView,
    isOverviewMode: !!isOverviewMode,
    useFieldGranularity,
    layoutFilters,
  });

  const selectedLayoutCategories = useMemo(() => getCategoryValuesFromFilters(layoutFilters), [layoutFilters]);
  const excelAvailableFields = useMemo(() => getAllFields(allItems), [allItems]);

  useEffect(() => {
    onDataLoaded(viewItems);
  }, [viewItems, onDataLoaded]);

  const ViewComponent = (ViewComponents as any)[viewInstance.viewType];
  if (!ViewComponent) return <div>未知视图: {viewInstance.viewType}</div>;

  const renderModels = useMemo(() => buildViewRenderModels({
    viewInstance,
    items: viewItems,
    allItems,
    dateRange,
    currentView: layoutView,
    inputSettings,
    layoutFilters,
    selectedCategories: selectedLayoutCategories,
  }), [allItems, dateRange, inputSettings, layoutFilters, layoutView, selectedLayoutCategories, viewInstance, viewItems]);

  const handlers = useViewRuntimeHandlers({
    app,
    actionService,
    viewInstance,
    dateRange,
    layoutView,
    excelAvailableFields,
  });

  const viewProps = buildViewProps({
    viewInstance,
    viewItems,
    dateRange,
    layoutView,
    useFieldGranularity,
    excelAvailableFields,
    onMarkDone,
    handlers,
    onOpenStatisticsPopover: openStatisticsPopover,
    onCloseStatisticsPopover: closeStatisticsPopover,
    timerService,
    timers,
    allThemes,
    inputSettings,
    selectedLayoutCategories,
    categoryColors,
    messageRenderPort,
    renderModels,
  });

  return <ViewComponent {...viewProps} />;
}
