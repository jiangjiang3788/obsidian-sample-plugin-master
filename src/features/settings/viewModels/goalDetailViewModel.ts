/** DEPRECATED: GoalOverview / GoalDetail are legacy compatibility files. New views must use ProgressView / StatisticsView. */
import type { GoalDefinition, Item, ViewInstance } from '@core/public';
import { buildGoalOverviewModel, resolveDerivedPeriod, splitGoalPath } from '@core/public';

export interface GoalDetailBlockDistributionItem {
  key: string;
  label: string;
  count: number;
  ratio: number;
}

export interface GoalDetailPeriodDistributionItem {
  periodId: string;
  label: string;
  count: number;
}

export interface GoalDetailStatusSummary {
  total: number;
  doneTasks: number;
  openTasks: number;
  completionRatio: number;
}

export interface GoalDetailStatisticsModel {
  selectedGoalPath?: string | null;
  selectedGoal?: GoalDefinition | null;
  overview: ReturnType<typeof buildGoalOverviewModel>;
  row: ReturnType<typeof buildGoalOverviewModel>['selectedRow'];
  statusSummary: GoalDetailStatusSummary;
  blockDistribution: GoalDetailBlockDistributionItem[];
  periodDistribution: GoalDetailPeriodDistributionItem[];
  matchingRecordCount: number;
}

export interface GoalDetailViewModelInput {
  items: Item[];
  module: ViewInstance;
  goals?: GoalDefinition[];
}

function normalizeGoalPath(value?: string | null): string | null {
  const path = splitGoalPath(value || '').goalPath;
  return path || null;
}

function readLoose(item: Item, key: string): unknown {
  const direct = (item as any)[key];
  if (direct !== undefined && direct !== null && String(direct).trim?.() !== '') return direct;
  const extra = (item as any).extra || {};
  if (extra[key] !== undefined) return extra[key];
  const aliases: Record<string, string[]> = {
    goalPath: ['目标', '目标路径'],
    goalPaths: ['目标', '目标路径'],
    date: ['日期'],
  };
  for (const alias of aliases[key] || []) {
    if ((item as any)[alias] !== undefined) return (item as any)[alias];
    if (extra[alias] !== undefined) return extra[alias];
  }
  return undefined;
}

function readGoalPaths(item: Item): string[] {
  const result: string[] = [];
  const push = (value: unknown) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }
    const raw = typeof value === 'object' ? (value as any).value ?? (value as any).label : value;
    String(raw ?? '')
      .split(/[,，\n]/)
      .map((part) => normalizeGoalPath(part))
      .filter(Boolean)
      .forEach((path) => result.push(path as string));
  };
  push((item as any).goalPath);
  push((item as any).goalPaths);
  push(readLoose(item, 'goalPath'));
  push(readLoose(item, 'goalPaths'));
  return Array.from(new Set(result));
}

function readDate(item: Item): string | null {
  const raw = String((item as any).date ?? readLoose(item, 'date') ?? '').trim();
  return raw || null;
}

function blockDistribution(row: NonNullable<ReturnType<typeof buildGoalOverviewModel>['selectedRow']>): GoalDetailBlockDistributionItem[] {
  const blocks = [
    ['task', '任务', row.taskCount],
    ['plan', '计划', row.planCount],
    ['review', '总结', row.reviewCount],
    ['habit', '打卡', row.habitCount],
    ['evidence', '事件', row.evidenceCount],
    ['blocker', '阻碍项', row.blockerCount],
    ['milestone', '里程碑', row.milestoneCount],
    ['thought', '思考', row.thoughtCount],
  ] as const;
  const total = Math.max(1, row.totalCount || 0);
  return blocks.map(([key, label, count]) => ({ key, label, count, ratio: count / total }));
}

function buildPeriodDistribution(items: Item[], selectedGoalPath: string | null, selectedGoal?: GoalDefinition | null): GoalDetailPeriodDistributionItem[] {
  if (!selectedGoalPath) return [];
  const map = new Map<string, GoalDetailPeriodDistributionItem>();
  for (const item of items || []) {
    if (!readGoalPaths(item).includes(selectedGoalPath)) continue;
    const date = readDate(item);
    const period = resolveDerivedPeriod(date || undefined, selectedGoal?.granularity || 'day');
    const current = map.get(period.id) || { periodId: period.id, label: period.label, count: 0 };
    current.count += 1;
    map.set(period.id, current);
  }
  return Array.from(map.values()).sort((a, b) => b.periodId.localeCompare(a.periodId, 'zh-CN')).slice(0, 12);
}

export function buildGoalDetailViewModel({ items, module, goals = [] }: GoalDetailViewModelInput): GoalDetailStatisticsModel {
  const config = module.viewConfig?.goalDetail || module.viewConfig?.goalOverview || module.viewConfig || {};
  const selectedGoalPath = normalizeGoalPath(config.goalPath || null);
  const selectedGoal = selectedGoalPath
    ? goals.find((goal) => normalizeGoalPath(goal.goalPath || goal.title) === selectedGoalPath) || null
    : null;
  const overview = buildGoalOverviewModel({
    items,
    goals,
    selectedGoalPath,
    limit: 1,
  });
  const row = overview.selectedRow || (overview.rows.length === 1 ? overview.rows[0] : null);
  const statusSummary: GoalDetailStatusSummary = row
    ? { total: row.totalCount, doneTasks: row.doneTaskCount, openTasks: row.openTaskCount, completionRatio: row.completionRatio }
    : { total: 0, doneTasks: 0, openTasks: 0, completionRatio: 0 };
  return {
    selectedGoalPath,
    selectedGoal,
    overview,
    row,
    statusSummary,
    blockDistribution: row ? blockDistribution(row) : [],
    periodDistribution: buildPeriodDistribution(items, selectedGoalPath, selectedGoal),
    matchingRecordCount: row?.totalCount || 0,
  };
}
