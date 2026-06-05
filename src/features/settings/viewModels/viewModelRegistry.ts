import type { FilterRule, InputSettings, Item, ViewInstance } from '@core/public';
import { buildBlockViewModel } from './blockViewModel';
import { buildEventTimelineViewModel } from './eventTimelineViewModel';
import { buildHeatmapViewModel } from './heatmapViewModel';
import { buildTimelineViewModel } from './timelineViewModel';
import { buildStatisticsViewModel } from './statisticsViewModel';
import { buildProgressViewModel } from './progressViewModel';
import { buildTaskExecutionViewModel } from './taskExecutionViewModel';

export type LayoutViewGranularity = '年' | '季' | '月' | '周' | '天' | string;

export interface ViewRenderModelContext {
  viewInstance: ViewInstance;
  items: Item[];
  allItems: Item[];
  dateRange: [Date, Date];
  currentView: LayoutViewGranularity;
  inputSettings: InputSettings;
  layoutFilters: FilterRule[];
  selectedCategories: string[];
}

export interface ViewRenderModels {
  effectiveGroupFields?: string[];
  groupTree?: unknown;
  filteredItems?: Item[];
  groupedTree?: unknown;
  timelineModel?: unknown;
  statisticsModel?: unknown;
  progressModel?: unknown;
  taskExecutionModel?: unknown;
  injectedThemesByPath?: unknown;
  injectedThemesToTrack?: string[];
  injectedDataByThemeAndDate?: unknown;
}

type ViewModelBuilder = (context: ViewRenderModelContext) => Partial<ViewRenderModels>;

const viewModelBuilders: Record<string, ViewModelBuilder> = {
  BlockView: ({ items, viewInstance }) => {
    const model = buildBlockViewModel({
      items,
      groupField: viewInstance.group,
      groupFields: viewInstance.groupFields,
    });

    return {
      effectiveGroupFields: model.effectiveGroupFields,
      groupTree: model.groupTree,
    };
  },

  EventTimelineView: ({ items, viewInstance, dateRange }) => {
    const model = buildEventTimelineViewModel({
      items,
      module: viewInstance,
      dateRange,
    });

    return {
      filteredItems: model.filteredItems,
      groupedTree: model.groupedTree,
    };
  },

  HeatmapView: ({ items, viewInstance, inputSettings }) => {
    const model = buildHeatmapViewModel({
      items,
      module: viewInstance,
      inputSettings,
    });

    return {
      injectedThemesByPath: model.themesByPath,
      injectedThemesToTrack: model.themesToTrack,
      injectedDataByThemeAndDate: model.dataByThemeAndDate,
    };
  },

  TimelineView: ({ items, viewInstance, dateRange, currentView }) => ({
    timelineModel: buildTimelineViewModel({
      items,
      module: viewInstance,
      dateRange,
      currentView: currentView as any,
    }),
  }),

  StatisticsView: ({ items, viewInstance, dateRange, currentView, selectedCategories }) => ({
    statisticsModel: buildStatisticsViewModel({
      items,
      dateRange,
      module: viewInstance,
      currentView: currentView as any,
      selectedCategories,
    }),
  }),

  ProgressView: ({ items, viewInstance }) => ({
    progressModel: buildProgressViewModel({
      items,
      module: viewInstance,
    }),
  }),

  TaskExecutionView: ({ allItems, viewInstance, dateRange, currentView, layoutFilters }) => ({
    taskExecutionModel: buildTaskExecutionViewModel({
      items: allItems,
      dateRange,
      viewInstance,
      keyword: '',
      layoutFilters,
    }),
  }),
};

export function buildViewRenderModels(context: ViewRenderModelContext): ViewRenderModels {
  const builder = viewModelBuilders[context.viewInstance.viewType];
  return builder ? builder(context) : {};
}
