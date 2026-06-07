// src/features/settings/layout/ViewContent.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo } from 'preact/hooks';
import type { ActionService, DataStore, FilterRule, InputSettings, Item, ViewInstance } from '@core/public';
import { getAllFields, getCategoryValuesFromFilters } from '@core/public';
import { DashboardViewComponents as ViewComponents } from '@features/settings';
import { selectCategoryColors, selectSettings, useMessageRenderPort, useSelector } from '@/app/public';
import type { TimerController } from '@shared/public';
import { useViewData } from '@/features/settings/useViewData';
import { buildViewRenderModels } from '@/features/settings/viewModels/viewModelRegistry';
import { closeStatisticsPopover, openStatisticsPopover } from './statisticsPopoverBridge';
import { useViewRuntimeHandlers } from './useViewRuntimeHandlers';
import { buildViewProps } from './viewPropsFactory';


function normalizeLegacyGoalViewInstance(viewInstance: ViewInstance): ViewInstance {
  const rawType = String((viewInstance as any).viewType || '');
  if (rawType === 'GoalOverviewView') {
    return {
      ...viewInstance,
      viewType: 'ProgressView' as any,
      viewConfig: {
        ...(viewInstance.viewConfig || {}),
        ...(viewInstance.viewConfig?.goalOverview || {}),
        mode: 'goal',
      },
    };
  }
  if (rawType === 'GoalDetailView') {
    return {
      ...viewInstance,
      viewType: 'StatisticsView' as any,
      viewConfig: {
        ...(viewInstance.viewConfig || {}),
        ...(viewInstance.viewConfig?.goalDetail || {}),
        groupBy: 'goal',
        metric: 'recordCount',
      },
    };
  }
  return viewInstance;
}

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
  const settings = useSelector(selectSettings);
  const normalizedViewInstance = useMemo(() => normalizeLegacyGoalViewInstance(viewInstance), [viewInstance]);

  const viewItems = useViewData({
    dataStore,
    sourceItems: allItems,
    viewInstance: normalizedViewInstance,
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

  const ViewComponent = (ViewComponents as any)[normalizedViewInstance.viewType];
  if (!ViewComponent) return <div>未知视图: {normalizedViewInstance.viewType}</div>;

  const renderModels = useMemo(() => buildViewRenderModels({
    viewInstance: normalizedViewInstance,
    items: viewItems,
    allItems,
    dateRange,
    currentView: layoutView,
    inputSettings,
    layoutFilters,
    selectedCategories: selectedLayoutCategories,
    goals: settings.goalSettings?.goals || [],
    goalSettings: settings.goalSettings,
  }), [allItems, dateRange, inputSettings, layoutFilters, layoutView, selectedLayoutCategories, settings.goalSettings, normalizedViewInstance, viewItems]);

  const handlers = useViewRuntimeHandlers({
    app,
    actionService,
    viewInstance: normalizedViewInstance,
    dateRange,
    layoutView,
    excelAvailableFields,
  });

  const viewProps = buildViewProps({
    viewInstance: normalizedViewInstance,
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
