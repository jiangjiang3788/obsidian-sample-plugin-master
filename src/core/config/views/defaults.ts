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
  view: 'BlockView', title: '块视图', collapsed: false, fields: [], group: 'categoryKey',
};

export const ENERGY_VIEW_DEFAULT_CONFIG: EnergyViewConfig = {
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
  showUnclassified: true,
};

export const EVENT_TIMELINE_VIEW_DEFAULT_CONFIG: EventTimelineViewConfig = {
  timeField: 'date',
  titleField: 'title',
  contentField: 'content',
  groupByDay: true,
  showWeekday: true,
  maxContentLength: 160,
  fields: ['title', 'date'],
  groupFields: [],
};

export const EXCEL_VIEW_DEFAULT_CONFIG: ExcelViewConfig = {
  view: 'ExcelView', title: '数据表格', collapsed: false, fields: [],
};

export const HEATMAP_VIEW_DEFAULT_CONFIG: HeatmapViewConfig = {
  displayMode: 'habit', sourceBlockId: '', goalPaths: [], maxDailyChecks: 10, allowManualEdit: true,
};

export const PROGRESS_VIEW_DEFAULT_CONFIG: ProgressViewConfig = {
  mode: 'goal',
  metric: 'recordCount',
  statusFilter: ['active', 'paused'],
  basePoints: 1,
  levelStep: 20,
  includedCategories: [],
  ratingBonusThreshold: 4,
  ratingBonusPoints: 1,
  showGoalBreakdown: true,
  showCategoryBreakdown: true,
  topN: 5,
};

export const STATISTICS_VIEW_DEFAULT_CONFIG: StatisticsViewConfig = {
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
  view: 'TableView', title: '表格视图', collapsed: false, rowField: 'categoryKey', colField: 'date',
};

export const TIMELINE_VIEW_DEFAULT_CONFIG: TimelineViewConfig = {
  defaultHourHeight: 50,
  MAX_HOURS_PER_DAY: 24,
  UNTRACKED_LABEL: '未记录',
  categories: {
    工作: { name: '工作', color: '#60a5fa', files: ['工作', 'Work'] },
    学习: { name: '学习', color: '#34d399', files: ['学习', 'Study'] },
    生活: { name: '生活', color: '#fbbf24', files: ['生活', 'Life'] },
  },
  progressOrder: ['工作', '学习', '生活'],
};
