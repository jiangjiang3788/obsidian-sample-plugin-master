import type { CurrentView, FilterRule, InputSettings, Item, ThemeDefinition, TimerState, ViewInstance } from '@core/types/public';
import type { GoalDefinition, GoalSettings } from '@core/goal/public';
import { buildBlockViewModel } from './blockViewModel';
import { buildEventTimelineViewModel } from './eventTimelineViewModel';
import { buildHeatmapViewModel } from './heatmapViewModel';
import { buildTimelineViewModel } from './timelineViewModel';
import { buildStatisticsViewModel } from './statisticsViewModel';
import { buildProgressViewModel } from './progressViewModel';
import { buildEnergyViewModel } from './energyViewModel';

export type LayoutViewGranularity = '年' | '季' | '月' | '周' | '天' | string;

export interface ViewRenderModelContext {
  viewInstance: ViewInstance;
  items: Item[];
  allItems: Item[];
  allRecords: Item[];
  dateRange: [Date, Date];
  currentView: LayoutViewGranularity;
  inputSettings: InputSettings;
  layoutFilters: FilterRule[];
  selectedCategories: string[];
  goals?: GoalDefinition[];
  goalSettings?: GoalSettings;
  themes?: ThemeDefinition[];
  timers?: TimerState[];
}

export interface ViewRenderModels {
  effectiveGroupFields?: string[];
  groupTree?: unknown;
  filteredItems?: Item[];
  groupedTree?: unknown;
  timelineModel?: unknown;
  statisticsModel?: unknown;
  progressModel?: unknown;
  energyModel?: unknown;
  injectedThemesByPath?: unknown;
  injectedThemesToTrack?: string[];
  injectedDataByThemeAndDate?: unknown;
  injectedGoalHeatmapGroups?: unknown;
}

type ViewModelBuilder = (context: ViewRenderModelContext) => Partial<ViewRenderModels>;

const viewModelBuilders: Record<string, ViewModelBuilder> = {
  BlockView: ({ items, viewInstance, goals }) => {
    const model = buildBlockViewModel({
      items,
      groupField: viewInstance.group,
      groupFields: viewInstance.groupFields,
      goals: goals || [],
    });

    return {
      effectiveGroupFields: model.effectiveGroupFields,
      groupTree: model.groupTree,
    };
  },

  EventTimelineView: ({ items, viewInstance, dateRange, goals }) => {
    const model = buildEventTimelineViewModel({
      items,
      module: viewInstance,
      dateRange,
      goals: goals || [],
    });

    return {
      filteredItems: model.filteredItems,
      groupedTree: model.groupedTree,
    };
  },

  HeatmapView: ({ items, viewInstance, inputSettings, goals, goalSettings }) => {
    const model = buildHeatmapViewModel({
      items,
      module: viewInstance,
      inputSettings,
      goals: goals || [],
      goalSettings,
    });

    return {
      injectedThemesByPath: model.themesByPath,
      injectedThemesToTrack: model.themesToTrack,
      injectedDataByThemeAndDate: model.dataByThemeAndDate,
      injectedGoalHeatmapGroups: model.goalGroups,
    };
  },

  TimelineView: ({ items, allRecords, viewInstance, dateRange, currentView }) => ({
    timelineModel: buildTimelineViewModel({
      items,
      records: allRecords,
      module: viewInstance,
      dateRange,
      currentView: currentView as any,
    }),
  }),

  StatisticsView: ({ items, viewInstance, dateRange, currentView, goals, inputSettings }) => ({
    statisticsModel: buildStatisticsViewModel({
      items,
      dateRange,
      module: viewInstance,
      currentView: currentView as any,
      goals: goals || [],
      themes: inputSettings?.themes || [],
    }),
  }),

  ProgressView: ({ items, viewInstance, goals, inputSettings }) => ({
    progressModel: buildProgressViewModel({
      items,
      module: viewInstance,
      goals: goals || [],
      themes: inputSettings?.themes || [],
    }),
  }),

  EnergyView: ({ allItems, allRecords, viewInstance, dateRange, currentView, goals, inputSettings, timers }) => ({
    energyModel: buildEnergyViewModel({
      items: allItems,
      records: allRecords,
      module: viewInstance,
      dateRange,
      currentView: currentView as CurrentView,
      goals: goals || [],
      themes: inputSettings?.themes || [],
      timers: timers || [],
    }),
  }),


};

export function buildViewRenderModels(context: ViewRenderModelContext): ViewRenderModels {
  const builder = viewModelBuilders[context.viewInstance.viewType];
  return builder ? builder(context) : {};
}
