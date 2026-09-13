import type {
  BlockViewConfig,
  EnergyViewConfig,
  EisenhowerViewConfig,
  EventTimelineViewConfig,
  ExcelViewConfig,
  HeatmapViewConfig,
  ProgressViewConfig,
  StatisticsViewConfig,
  TableViewConfig,
  TimelineViewConfig,
} from './types';

export const BLOCK_VIEW_DEFAULT_CONFIG: BlockViewConfig = {
  dateRole: 'default',
  view: 'BlockView', title: '块视图', collapsed: false, fields: [], group: 'recordType',
};

export const ENERGY_VIEW_DEFAULT_CONFIG: EnergyViewConfig = {
  dateRole: 'default',
  windowDays: 7,
  recentSampleLimit: 5,
  maxGoals: 3,
  goalPath: '',
  showTimeline: true,
  showContext: true,
  showEffects: true,
  analysisWindowDays: 30,
  showPatterns: true,
  showManagement: true,
  currentContext: 'any',
};

export const EISENHOWER_VIEW_DEFAULT_CONFIG: EisenhowerViewConfig = {
  dateRole: 'default',
  showUnclassified: true,
};

export const EVENT_TIMELINE_VIEW_DEFAULT_CONFIG: EventTimelineViewConfig = {
  dateRole: 'default',
  timeField: 'date',
  titleField: 'primaryText',
  contentField: 'content',
  groupByDay: true,
  showWeekday: true,
  maxContentLength: 160,
  fields: ['primaryText', 'date'],
  groupFields: [],
};

export const EXCEL_VIEW_DEFAULT_CONFIG: ExcelViewConfig = {
  dateRole: 'default',
  view: 'ExcelView', title: '数据表格', collapsed: false, fields: [],
};

export const HEATMAP_VIEW_DEFAULT_CONFIG: HeatmapViewConfig = {
  dateRole: 'default',
  displayMode: 'habit', sourceRecordTypeId: '', goalPaths: [], maxDailyChecks: 10, allowManualEdit: true,
};

export const PROGRESS_VIEW_DEFAULT_CONFIG: ProgressViewConfig = {
  dateRole: 'default',
  mode: 'goal',
  metric: 'recordCount',
  statusFilter: ['active', 'paused'],
  basePoints: 1,
  levelStep: 20,
  includedRecordTypes: [],
  ratingBonusThreshold: 4,
  ratingBonusPoints: 1,
  showGoalBreakdown: true,
  showRecordTypeBreakdown: true,
  topN: 5,
};

export const STATISTICS_VIEW_DEFAULT_CONFIG: StatisticsViewConfig = {
  dateRole: 'default',
  groupBy: 'goal',
  metric: 'recordCount',
  chartType: 'bar',
  goalPath: '',
  topN: 10,
  categories: [],
  displayMode: 'smart',
  minVisibleHeight: 15,
  usePeriodField: false,
};

export const TABLE_VIEW_DEFAULT_CONFIG: TableViewConfig = {
  dateRole: 'default',
  view: 'TableView', title: '表格视图', collapsed: false, rowField: 'recordType', colField: 'date',
};

export const TIMELINE_VIEW_DEFAULT_CONFIG: TimelineViewConfig = {
  dateRole: 'default',
  defaultHourHeight: 50,
  MAX_HOURS_PER_DAY: 24,
  UNTRACKED_LABEL: '未记录',
};
