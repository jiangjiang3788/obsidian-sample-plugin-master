import type { ViewName } from '@/core/view/ViewConfig';

/** StatisticsView 的默认配置。 */
export interface StatisticsViewConfig {
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
export interface HeatmapViewConfig {
  displayMode: 'habit' | 'count';
  sourceBlockId: string;
  themePaths: string[];
  maxDailyChecks: number;
  allowManualEdit: boolean;
}

/** ProgressView 默认配置（独立成长/积分视图）。 */
export interface ProgressViewConfig {
  /** Progress 只保留目标经验模式。 */
  mode?: 'goal';
  metric?: 'completionRate' | 'taskDone' | 'habitCount' | 'milestoneCount' | 'blockerCount' | 'recordCount';
  statusFilter?: string[];
  basePoints: number;
  levelStep: number;
  includedCategories: string[];
  ratingBonusThreshold: number;
  ratingBonusPoints: number;
  showThemeBreakdown: boolean;
  showCategoryBreakdown: boolean;
  topN: number;
}

/** EnergyView 默认配置（独立精力状态 / 时间线 / 观察分析视图）。 */
export interface EnergyViewConfig {
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


/** TableView 默认配置（供视图 + 编辑器复用）。 */
export interface TableViewConfig {
  view: 'TableView';
  title: string;
  collapsed: boolean;
  rowField: string;
  colField: string;
}

/** TimelineView 分类配置。 */
export interface CategoryConfig {
  /** Stable identifier used across aggregation / charting. */
  name: string;
  color: string;
  files: string[];
  /** Optional display alias. */
  alias?: string;
}

/** TimelineView 默认配置（供视图 + 编辑器复用）。 */
export interface TimelineViewConfig {
  defaultHourHeight: number;
  MAX_HOURS_PER_DAY: number;
  UNTRACKED_LABEL: string;
  categories: Record<string, CategoryConfig>;
  progressOrder: string[];
}

/** BlockView 默认配置（供视图 + 编辑器复用）。 */
export interface BlockViewConfig {
  view: 'BlockView';
  title: string;
  collapsed: boolean;
  fields: string[];
  group: string;
}

/** ExcelView 默认配置（供视图 + 编辑器复用）。 */
export interface ExcelViewConfig {
  view: 'ExcelView';
  title: string;
  collapsed: boolean;
  fields: string[];
}

/** EventTimelineView 默认配置（供视图 + 编辑器复用）。 */
export interface EventTimelineViewConfig {
  timeField: string;
  titleField: string;
  contentField: string;
  groupByDay: boolean;
  showWeekday: boolean;
  maxContentLength: number;
  fields: string[];
  groupFields: string[];
}

/** 导出字段展示规则。 */
export interface FieldRenderConfig {
  /**
   * 字段展示类型：
   * - normal: 普通 "标签: 值"
   * - content: 多行内容字段，按行展开
   * - emojiOrLink: 纯 emoji 直接展示，否则转为 ![[ ]] 图片链接
   */
  type?: 'normal' | 'content' | 'emojiOrLink';
}

/** View 导出配置（供 exportUtils 使用）。 */
export interface ExportViewConfig {
  /** @deprecated 请使用 groupFields 支持多级分组 */
  groupField?: string;
  groupFields?: string[];
  groupTitlePrefix?: string;
  useMarkdownHeadingForGroup: boolean;
  idTemplate: string;
  detailFields: string[];
  fieldLabels: Record<string, string>;
  fieldRender?: Record<string, FieldRenderConfig>;
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
  | EnergyViewConfig;

export type ViewDefaultConfigMap = Record<ViewName, ViewDefaultConfig>;
