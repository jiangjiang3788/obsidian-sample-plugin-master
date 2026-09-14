import type { ViewTemporalConfig } from '../../view-config/dateRole';


/** StatisticsView 的默认配置。 */
export interface StatisticsViewConfig extends ViewTemporalConfig {
  /** 目标中心：统计视图只按目标分组；时间与其他筛选统一由控制栏/视图筛选提供。 */
  groupBy: 'goal';
  metric: 'recordCount' | 'taskCount' | 'doneTaskCount' | 'habitCount' | 'blockerCount' | 'milestoneCount';
  chartType: 'bar';
  goalPath: string;
  topN: number;
  categories: { name: string; color: string; alias?: string }[];
  displayMode: 'linear' | 'logarithmic' | 'smart';
  /** 最小可见高度百分比。 */
  minVisibleHeight: number;
  /** 是否使用周期字段过滤。 */
  usePeriodField: boolean;
}

/** HeatmapView 默认配置（供视图 + 编辑器复用）。 */
export interface HeatmapViewConfig extends ViewTemporalConfig {
  displayMode: 'habit' | 'count';
  sourceRecordTypeId: string;
  goalPaths: string[];
  maxDailyChecks: number;
  allowManualEdit: boolean;
}

/** ProgressView 默认配置（独立成长/积分视图）。 */
export interface ProgressViewConfig extends ViewTemporalConfig {
  /** Progress 只保留目标经验模式。 */
  mode?: 'goal';
  metric?: 'completionRate' | 'taskDone' | 'habitCount' | 'milestoneCount' | 'blockerCount' | 'recordCount';
  statusFilter?: string[];
  basePoints: number;
  levelStep: number;
  includedRecordTypes: string[];
  ratingBonusThreshold: number;
  ratingBonusPoints: number;
  showGoalBreakdown: boolean;
  showRecordTypeBreakdown: boolean;
  topN: number;
}

/** EnergyView 默认配置（独立精力状态 / 时间线 / 观察分析视图）。 */
export interface EnergyViewConfig extends ViewTemporalConfig {
  /** 最近时间线窗口。当前 core timeline 允许 1–31 天。 */
  windowDays: number;
  /** 最近记录列表数量。 */
  recentSampleLimit: number;
  /** 同一视图最多展示多少个有 Energy 的目标；0 表示不限制。 */
  maxGoals: number;
  /** 可选目标路径；留空时按目标分组展示所有有 Energy 的目标。 */
  goalPath: string;
  showTimeline: boolean;
  showContext: boolean;
  showEffects: boolean;
  /** 节律 / 延迟 / 连续工作 / 停止代理分析窗口。 */
  analysisWindowDays: number;
  showPatterns: boolean;
  /** 当前精力的个人化管理候选与保存力量护栏。 */
  showManagement: boolean;
  /** Current execution context used as a hard recommendation eligibility boundary. */
  currentContext: 'any' | 'work' | 'home' | 'commute' | 'out';
  /** 最近一周自动复盘。 */
  /** 轻量 N-of-1 前后比较。 */
}


/** Eisenhower 四象限默认配置。 */
export interface EisenhowerViewConfig extends ViewTemporalConfig {
  showUnclassified: boolean;
}

/** TableView 默认配置（供视图 + 编辑器复用）。 */
export interface TableViewConfig extends ViewTemporalConfig {
  view: 'TableView';
  title: string;
  collapsed: boolean;
  rowField: string;
  colField: string;
}

/** Generic Statistics chart bucket. This is not the retired Record Category domain. */
export interface StatisticsBucketConfig {
  /** Stable identifier used across aggregation / charting. */
  name: string;
  color: string;
  files: string[];
  /** Optional display alias. */
  alias?: string;
}

/** TimelineView 默认配置（供视图 + 编辑器复用）。 Goal identity/color is external domain data. */
export interface TimelineViewConfig extends ViewTemporalConfig {
  defaultHourHeight: number;
  MAX_HOURS_PER_DAY: number;
  UNTRACKED_LABEL: string;
}

/** BlockView 默认配置（供视图 + 编辑器复用）。 */
export interface BlockViewConfig extends ViewTemporalConfig {
  view: 'BlockView';
  title: string;
  collapsed: boolean;
  fields: string[];
  group: string;
}

/** ExcelView 默认配置（供视图 + 编辑器复用）。 */
export interface ExcelViewConfig extends ViewTemporalConfig {
  view: 'ExcelView';
  title: string;
  collapsed: boolean;
  fields: string[];
}

/** EventTimelineView 默认配置（供视图 + 编辑器复用）。 */
export interface EventTimelineViewConfig extends ViewTemporalConfig {
  timeField: string;
  titleField: string;
  contentField: string;
  groupByDay: boolean;
  showWeekday: boolean;
  maxContentLength: number;
  fields: string[];
  groupFields: string[];
}

/** 导出策略：View 只声明结构策略，Record Profile 负责字段语义。 */
export type ExportStrategy =
  | 'records'
  | 'table'
  | 'timeline'
  | 'event-timeline'
  | 'statistics'
  | 'heatmap'
  | 'progress'
  | 'energy'
  | 'eisenhower';

/**
 * View 导出配置。
 *
 * 设计约束：
 * - 不再为每个 View 复制 idTemplate/detailFields/fieldLabels；
 * - View 只声明“如何组织数据”；
 * - Record 类型自己的可读字段由 exportUtils 的 Record Profile 统一决定；
 * - TaskSession 等内部记录作为关联证据，不作为默认独立导出行。
 */
export interface ExportViewConfig {
  strategy: ExportStrategy;
  /** 未显式配置 groupFields/group 时才使用的默认分组。 */
  defaultGroupFields?: string[];
  /** Timeline 中 TaskSession 的展示粒度。 */
  taskSessionMode?: 'summary' | 'expanded';
  /** Timeline 的实际时长是否仅统计当前日期范围内的 Session。 */
  taskSessionScope?: 'all' | 'range';
}

export type ViewDefaultConfig =
  | TableViewConfig
  | BlockViewConfig
  | ExcelViewConfig
  | TimelineViewConfig
  | EventTimelineViewConfig
  | StatisticsViewConfig
  | HeatmapViewConfig
  | ProgressViewConfig
  | EnergyViewConfig
  | EisenhowerViewConfig;

export type ViewDefaultConfigMap = Record<string, ViewDefaultConfig>;
