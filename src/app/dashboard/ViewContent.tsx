// src/features/settings/layout/ViewContent.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo } from 'preact/hooks';
import type { ActionService, DataStore } from '@core/services/public';
import type { FilterRule, InputSettings, RecordViewItem, ViewInstance } from '@core/types/public';
import { getAllFields } from '@core/types/public';
import { getCategoryValuesFromFilters } from '@core/utils/public';
import { DashboardViewComponents as ViewComponents } from '@features/views/public';
import { selectCategoryColors, selectSettings } from '@/app/store/selectors';
import { useMessageRenderPort } from '@/app/AppStoreContext';
import { useSelector } from '@/app/store/useSelector';
import type { TimerController } from '@shared/types/public';
import { useViewData } from '@/app/dashboard/useViewData';
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
  allItems: RecordViewItem[];
  allRecords: RecordViewItem[];
  inputSettings: InputSettings;
  onDataLoaded: (items: RecordViewItem[]) => void;
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
  allRecords,
  inputSettings,
  onDataLoaded,
}: ViewContentProps) {
  const messageRenderPort = useMessageRenderPort();
  const categoryColors = useSelector(selectCategoryColors);
  const settings = useSelector(selectSettings);
  const normalizedViewInstance = viewInstance;

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
    goals: settings.goalSettings?.goals || [],
    selectedLayoutCategories,
    categoryColors,
    messageRenderPort,
    allItems,
    allRecords,
    goalSettings: settings.goalSettings,
  });

  return <ViewComponent {...viewProps} />;
}
