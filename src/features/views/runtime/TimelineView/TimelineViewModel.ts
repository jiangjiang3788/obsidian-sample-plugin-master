import type { RecordViewItem, TimelineTask } from '@core/types/public';
import type { GoalSettings, GoalTimeAllocationSummary } from '@core/goal/public';
import {
  buildGoalTimeAllocationSummary,
  normalizeGoalPath,
  resolveGoalColor,
  sortGoalsBySettingsOrder,
  UNASSIGNED_GOAL_COLOR,
  UNASSIGNED_GOAL_KEY,
} from '@core/goal/public';
import type { TimelineViewConfig } from '@core/view/public';
import { TIMELINE_VIEW_DEFAULT_CONFIG } from '@core/view/public';
import {
  buildDailyViewData,
  buildMonthlyAndWeeklySummary,
  buildSummaryGoalHours,
  dayjs,
} from '@core/utils/public';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';
import { processItemsToTimelineTasks } from '../timeline-parser';
import type { DailyViewData } from './TimelineViewTypes';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(isBetween);

export type TimelineCurrentView = '年' | '季' | '月' | '周' | '天';

export interface TimelineSummaryWeek {
  summary: Record<string, number>;
  totalHours: number;
  goalSummary?: GoalTimeAllocationSummary | null;
}

export interface TimelineSummaryRow {
  month: string;
  monthlySummary: Record<string, number>;
  totalMonthHours: number;
  monthlyGoalSummary?: GoalTimeAllocationSummary | null;
  weeklySummaries: Array<TimelineSummaryWeek | null>;
}

export interface TimelineRenderModel {
  config: TimelineViewConfig;
  colorMap: Record<string, string>;
  timelineTasks: TimelineTask[];
  dailyViewData: DailyViewData | null;
  isSummaryView: boolean;
  summaryData: TimelineSummaryRow[];
  summaryGoalHours: Record<string, number>;
  goalOrder: string[];
  totalSummaryHours: number;
  goalAllocationSummary: GoalTimeAllocationSummary | null;
  goalAllocationByDay: Record<string, GoalTimeAllocationSummary>;
  hasGoalAllocation: boolean;
}

export interface TimelineViewModuleLike {
  /** Persisted view config is intentionally partial and may come from older settings. */
  viewConfig?: Record<string, unknown>;
}

export function resolveTimelineConfig(module: TimelineViewModuleLike, injectedModel?: { config?: TimelineViewConfig }): TimelineViewConfig {
  if (injectedModel?.config) return injectedModel.config;
  const defaults = JSON.parse(JSON.stringify(TIMELINE_VIEW_DEFAULT_CONFIG)) as TimelineViewConfig;
  const userConfig = (module?.viewConfig || {}) as Partial<TimelineViewConfig>;
  return {
    dateRole: userConfig.dateRole || defaults.dateRole,
    defaultHourHeight: Number.isFinite(Number(userConfig.defaultHourHeight)) ? Number(userConfig.defaultHourHeight) : defaults.defaultHourHeight,
    MAX_HOURS_PER_DAY: Number.isFinite(Number(userConfig.MAX_HOURS_PER_DAY)) ? Number(userConfig.MAX_HOURS_PER_DAY) : defaults.MAX_HOURS_PER_DAY,
    UNTRACKED_LABEL: String(userConfig.UNTRACKED_LABEL || defaults.UNTRACKED_LABEL),
  };
}

export function buildTimelineColorMap(
  goalSettings?: GoalSettings,
  timelineTasks: TimelineTask[] = [],
  untrackedLabel = TIMELINE_VIEW_DEFAULT_CONFIG.UNTRACKED_LABEL,
): Record<string, string> {
  const colorMap: Record<string, string> = {};
  const goals = goalSettings?.goals || [];
  const byPath = new Map(goals.map((goal) => [normalizeGoalPath(goal.path) || goal.path, goal] as const));

  for (const goal of goals) {
    const path = normalizeGoalPath(goal.path);
    if (path) colorMap[path] = resolveGoalColor(goal, path);
  }
  for (const task of timelineTasks) {
    const path = normalizeGoalPath(String(task.goalPath || '').trim());
    if (!path || colorMap[path]) continue;
    colorMap[path] = resolveGoalColor(byPath.get(path), path);
  }

  colorMap[UNASSIGNED_GOAL_KEY] = UNASSIGNED_GOAL_COLOR;
  colorMap[untrackedLabel] = '#d1d5db';
  return colorMap;
}

export function buildTimelineGoalOrder(goalSettings?: GoalSettings, timelineTasks: TimelineTask[] = []): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const goal of sortGoalsBySettingsOrder((goalSettings?.goals || []).filter((goal) => goal.status !== 'archived'))) {
    const path = normalizeGoalPath(goal.path);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    ordered.push(path);
  }
  const observed = Array.from(new Set(timelineTasks.map((task) => normalizeGoalPath(String(task.goalPath || '').trim())).filter((path): path is string => !!path))).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  for (const path of observed) {
    if (seen.has(path)) continue;
    seen.add(path);
    ordered.push(path);
  }
  if (timelineTasks.some((task) => !normalizeGoalPath(String(task.goalPath || '').trim()))) ordered.push(UNASSIGNED_GOAL_KEY);
  return ordered;
}

export function resolveTimelineTasks(items: RecordViewItem[], records: RecordViewItem[] = items): TimelineTask[] {
  const visibleTaskIds = new Set(items.filter((item) => item.recordType === 'task').map((item) => item.id));
  const timelineRecords = records.filter((record) => (
    (record.recordType === 'task' && visibleTaskIds.has(record.id))
    || (record.recordType === 'task-session' && !!record.taskId && visibleTaskIds.has(record.taskId))
  ));
  return processItemsToTimelineTasks(timelineRecords);
}


export function buildTimelineSummaryData(args: {
  timelineTasks: TimelineTask[];
  dateRange: [Date, Date];
  config: TimelineViewConfig;
  isSummaryView: boolean;
}): TimelineSummaryRow[] {
  if (!args.isSummaryView) return [];
  const viewStart = dayjs(args.dateRange[0]);
  const viewEnd = dayjs(args.dateRange[1]);
  const tasksInRange = args.timelineTasks.filter((task) => dayjs(task.doneDate).isBetween(viewStart, viewEnd, 'day', '[]'));
  return buildMonthlyAndWeeklySummary(tasksInRange, args.config.UNTRACKED_LABEL) as TimelineSummaryRow[];
}


function attachGoalSummariesToSummaryRows(args: {
  rows: TimelineSummaryRow[];
  records: RecordViewItem[];
  goals: GoalSettings['goals'];
  presetRevisions?: GoalSettings['timePresetRevisions'];
}): TimelineSummaryRow[] {
  const { rows, records, goals, presetRevisions = [] } = args;
  if (!goals?.length) return rows;
  return rows.map((row) => {
    const month = dayjs(`${row.month}-01`);
    if (!month.isValid()) return row;
    const daysInMonth = month.daysInMonth();
    const monthlyGoalSummary = buildGoalTimeAllocationSummary({
      records,
      goals,
      rangeStart: month.startOf('month').toDate(),
      rangeEnd: month.endOf('month').toDate(),
      presetRevisions,
    });
    const weeklySummaries = Array.from({ length: 5 }).map((_, index) => {
      const weekStartDay = index * 7 + 1;
      if (weekStartDay > daysInMonth) return null;
      const existing = row.weeklySummaries[index];
      const start = month.date(weekStartDay).startOf('day');
      const end = month.date(Math.min(daysInMonth, weekStartDay + 6)).endOf('day');
      const goalSummary = buildGoalTimeAllocationSummary({ records, goals, presetRevisions, rangeStart: start.toDate(), rangeEnd: end.toDate() });
      if (!existing && !goalSummary.hasConfiguredPreset && goalSummary.trackedMinutes <= 0) return null;
      return {
        summary: existing?.summary || {},
        totalHours: existing?.totalHours || ((end.diff(start, 'day') + 1) * 24),
        goalSummary,
      };
    });
    return { ...row, monthlyGoalSummary, weeklySummaries };
  });
}

export function buildTimelineRenderModel(args: {
  items: RecordViewItem[];
  records?: RecordViewItem[];
  module: TimelineViewModuleLike;
  dateRange: [Date, Date];
  currentView: TimelineCurrentView;
  goalSettings?: GoalSettings;
  injectedModel?: Partial<Pick<TimelineRenderModel, 'config' | 'timelineTasks' | 'dailyViewData' | 'summaryGoalHours' | 'summaryData' | 'goalAllocationSummary' | 'goalAllocationByDay'>>;
}): TimelineRenderModel {
  const { items, records = items, module, dateRange, currentView, goalSettings, injectedModel } = args;
  const config = resolveTimelineConfig(module, injectedModel?.config ? { config: injectedModel.config } : undefined);
  const timelineTasks = injectedModel?.timelineTasks ?? resolveTimelineTasks(items, records);
  const actualTimelineTasks = timelineTasks.filter((task) => task.timelineSource !== 'task-plan');
  const colorMap = buildTimelineColorMap(goalSettings, timelineTasks, config.UNTRACKED_LABEL);
  const goalOrder = buildTimelineGoalOrder(goalSettings, timelineTasks);
  const isSummaryView = currentView === '年' || currentView === '季';

  const baseSummaryData = injectedModel?.summaryData ?? buildTimelineSummaryData({ timelineTasks: actualTimelineTasks, dateRange, config, isSummaryView });
  const goals = goalSettings?.goals || [];
  const presetRevisions = goalSettings?.timePresetRevisions || [];
  const summaryData = isSummaryView ? attachGoalSummariesToSummaryRows({ rows: baseSummaryData, records, goals, presetRevisions }) : baseSummaryData;

  // Planned occupancy is visual guidance, not completed/actual effort. Keep progress
  // summaries grounded in execution facts (Session or legacy actual-range fallback).
  const summaryGoalHours = injectedModel?.summaryGoalHours ?? (isSummaryView ? {} : (buildSummaryGoalHours(actualTimelineTasks, dateRange, config.UNTRACKED_LABEL) || {}));
  const dailyViewData = injectedModel?.dailyViewData ?? (isSummaryView ? null : buildDailyViewData(timelineTasks, dateRange));
  const totalSummaryHours = Object.values(summaryGoalHours).reduce((sum, hours) => sum + Number(hours || 0), 0);

  const hasGoalAllocation = goals.length > 0;
  const goalAllocationSummary = injectedModel?.goalAllocationSummary ?? (hasGoalAllocation
    ? buildGoalTimeAllocationSummary({ records, goals, presetRevisions, rangeStart: dateRange[0], rangeEnd: dateRange[1] })
    : null);
  const goalAllocationByDay = injectedModel?.goalAllocationByDay ?? (() => {
    if (!hasGoalAllocation || isSummaryView || !dailyViewData) return {};
    const byDay: Record<string, GoalTimeAllocationSummary> = {};
    for (const rawDay of dailyViewData.dateRangeDays) {
      const day = dayjs(rawDay);
      const key = day.format('YYYY-MM-DD');
      byDay[key] = buildGoalTimeAllocationSummary({
        records,
        goals,
        rangeStart: day.startOf('day').toDate(),
        rangeEnd: day.endOf('day').toDate(),
        presetRevisions,
      });
    }
    return byDay;
  })();

  return {
    config,
    colorMap,
    timelineTasks,
    dailyViewData,
    isSummaryView,
    summaryData,
    summaryGoalHours,
    goalOrder,
    totalSummaryHours,
    goalAllocationSummary,
    goalAllocationByDay,
    hasGoalAllocation,
  };
}
