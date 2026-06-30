import type { Item } from '@/core/types/schema';
import type { CycleGranularity, GoalDefinition, GoalMetricContract } from './types';
import { splitGoalPath } from './path';
import { resolveDerivedPeriod } from './period';

export interface GoalOverviewMetricProgress {
  key: string;
  label: string;
  currentValue: number;
  targetValue?: number;
  unit?: string;
  direction: GoalMetricContract['direction'];
  progressRatio: number;
  status: 'not-started' | 'in-progress' | 'achieved' | 'attention';
}

export interface GoalOverviewCycleSummary {
  id: string;
  title: string;
  status: 'active';
  granularity: Exclude<CycleGranularity, 'custom'>;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isOverdue: boolean;
  dayProgressRatio: number;
}

export interface GoalOverviewRow {
  goalId?: string | null;
  title: string;
  goalPath: string;
  themePath?: string | null;
  status?: GoalDefinition['status'];
  totalCount: number;
  taskCount: number;
  openTaskCount: number;
  doneTaskCount: number;
  planCount: number;
  reviewCount: number;
  habitCount: number;
  evidenceCount: number;
  blockerCount: number;
  milestoneCount: number;
  thoughtCount: number;
  latestDate?: string | null;
  completionRatio: number;
  recentItems: Item[];
  coreBlockCounts: Record<string, number>;
  icon?: string | null;
  activeCycle?: GoalOverviewCycleSummary | null;
  metricProgress?: GoalOverviewMetricProgress[];
}

export interface GoalOverviewModel {
  rows: GoalOverviewRow[];
  selectedGoalPath?: string | null;
  selectedRow?: GoalOverviewRow | null;
  totalGoals: number;
  totalRecords: number;
  orphanRecordCount: number;
}


function readLooseField(item: Item, field: string): any {
  const direct = (item as any)[field];
  if (direct !== undefined && direct !== null && String(direct).trim?.() !== '') return direct;
  const extra = (item as any).extra || {};
  if (extra[field] !== undefined) return extra[field];
  const aliases: Record<string, string[]> = {
    goalPath: ['目标', '目标路径'],
    goalPaths: ['目标', '目标路径'],
    themePath: ['主题', '主题路径'],
    coreBlock: ['核心Block'],
    date: ['日期'],
  };
  for (const alias of aliases[field] || []) {
    if (extra[alias] !== undefined) return extra[alias];
    if ((item as any)[alias] !== undefined) return (item as any)[alias];
  }
  return undefined;
}

function normalizeDate(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

function titleFromPath(path: string | null | undefined): string {
  const parsed = splitGoalPath(path || '');
  const normalized = parsed.goalPath || String(path ?? '').trim();
  if (!normalized) return '未命名目标';
  return parsed.leafGoal || normalized;
}

function normalizeGoalPathValue(path: unknown): string | null {
  const normalized = splitGoalPath(path || '').goalPath || String(path ?? '').trim();
  return normalized || null;
}

export function makeStableGoalIdFromPath(path: string): string {
  const normalized = splitGoalPath(path).goalPath || String(path || '').trim();
  const safe = normalized
    .toLowerCase()
    .replace(/[\\/\s]+/g, '-')
    .replace(/[^a-z0-9\-_.\u4e00-\u9fa5]/gi, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `goal.${safe || 'untitled'}`;
}

function readGoalPaths(item: Item): string[] {
  const values: string[] = [];
  const push = (value: unknown) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }
    const raw = typeof value === 'object' ? (value as any).value ?? (value as any).label : value;
    String(raw ?? '')
      .split(/[,，\n]/)
      .map((part) => splitGoalPath(part).goalPath)
      .filter(Boolean)
      .forEach((part) => values.push(part as string));
  };
  push((item as any).goalPath);
  push((item as any).goalPaths);
  push(readLooseField(item, 'goalPath'));
  push(readLooseField(item, 'goalPaths'));
  push(readLooseField(item, '目标'));
  return Array.from(new Set(values));
}

function readThemePath(item: Item): string | null {
  return String((item as any).themePath ?? readLooseField(item, 'themePath') ?? readLooseField(item, '主题') ?? '').trim() || null;
}

function readCoreBlock(item: Item): string {
  const raw = String((item as any).coreBlock ?? readLooseField(item, 'coreBlock') ?? readLooseField(item, '核心Block') ?? '').trim();
  if (raw) return raw;
  const category = String((item as any).categoryKey ?? '').trim();
  if (/任务/.test(category) || item.type === 'task') return 'task';
  if (/计划/.test(category)) return 'plan';
  if (/总结|复盘/.test(category)) return 'review';
  if (/打卡/.test(category)) return 'habit';
  if (/事件|证据/.test(category)) return 'evidence';
  if (/阻碍|风险/.test(category)) return 'blocker';
  if (/里程碑/.test(category)) return 'milestone';
  if (/思考|闪念/.test(category)) return 'thought';
  return category || 'record';
}

function isDoneTask(item: Item): boolean {
  const raw = String((item as any).rawSource ?? (item as any).fullData ?? item.content ?? item.title ?? '').trim();
  return /^-\s*\[[xX]\]/.test(raw) || /完成/.test(String(readLooseField(item, '状态') ?? ''));
}

function dateToEpochDay(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(time) ? Math.floor(time / 86400000) : null;
}

function metricSourceValue(metric: GoalMetricContract, row: GoalOverviewRow): number {
  const text = `${metric.key} ${metric.label}`.toLowerCase();
  if (/done|complete|完成/.test(text)) return row.doneTaskCount;
  if (/open|todo|待办|未完成/.test(text)) return row.openTaskCount;
  if (/task|任务/.test(text)) return row.taskCount;
  if (/habit|checkin|打卡/.test(text)) return row.habitCount;
  if (/evidence|event|事件|证据/.test(text)) return row.evidenceCount;
  if (/blocker|risk|阻碍|风险/.test(text)) return row.blockerCount;
  if (/milestone|里程碑/.test(text)) return row.milestoneCount;
  if (/review|总结|复盘/.test(text)) return row.reviewCount;
  if (/plan|计划/.test(text)) return row.planCount;
  if (/thought|思考|闪念/.test(text)) return row.thoughtCount;
  return row.totalCount;
}

function metricProgress(metric: GoalMetricContract, row: GoalOverviewRow): GoalOverviewMetricProgress {
  const currentValue = metricSourceValue(metric, row);
  const targetValue = typeof metric.targetValue === 'number' ? metric.targetValue : undefined;
  let progressRatio = targetValue && targetValue > 0 ? currentValue / targetValue : (currentValue > 0 ? 1 : 0);
  if (metric.direction === 'decrease' && targetValue !== undefined) progressRatio = currentValue <= targetValue ? 1 : Math.max(0, targetValue / Math.max(1, currentValue));
  if (metric.direction === 'boolean') progressRatio = currentValue > 0 ? 1 : 0;
  if (metric.direction === 'maintain' && targetValue !== undefined) progressRatio = currentValue === targetValue ? 1 : Math.max(0, 1 - Math.abs(currentValue - targetValue) / Math.max(1, Math.abs(targetValue)));
  const clamped = Math.max(0, Math.min(1, progressRatio || 0));
  return {
    key: metric.key,
    label: metric.label || metric.key,
    currentValue,
    targetValue,
    unit: metric.unit,
    direction: metric.direction,
    progressRatio: clamped,
    status: clamped >= 1 ? 'achieved' : currentValue > 0 ? 'in-progress' : 'not-started',
  };
}

export function buildGoalOverviewModel(input: {
  items: Item[];
  goals?: GoalDefinition[];
  selectedGoalPath?: string | null;
  limit?: number;
}): GoalOverviewModel {
  const items = input.items || [];
  const goals = input.goals || [];
  const selectedGoalPath = normalizeGoalPathValue(input.selectedGoalPath);
  const limit = Math.max(1, input.limit || 20);
  const goalsByPath = new Map<string, GoalDefinition>();
  const goalPathById = new Map<string, string>();
  for (const goal of goals) {
    const path = normalizeGoalPathValue(goal.goalPath || goal.title);
    if (path) {
      goalsByPath.set(path, goal);
      goalPathById.set(goal.id, path);
    }
  }
  const activeCycleByGoalPath = new Map<string, GoalOverviewCycleSummary>();
  const todayText = new Date().toISOString().slice(0, 10);
  for (const goal of goals || []) {
    const path = normalizeGoalPathValue(goal.goalPath || goal.title);
    if (!path) continue;
    const period = resolveDerivedPeriod(todayText, 'week');
    activeCycleByGoalPath.set(path, {
      id: period.id,
      title: period.label,
      status: 'active',
      granularity: period.granularity,
      startDate: period.startDate,
      endDate: period.endDate,
      isActive: true,
      isOverdue: false,
      dayProgressRatio: (() => {
        const start = dateToEpochDay(period.startDate) ?? 0;
        const end = dateToEpochDay(period.endDate) ?? start;
        const now = dateToEpochDay(todayText) ?? start;
        return Math.max(0, Math.min(1, (now - start + 1) / Math.max(1, end - start + 1)));
      })(),
    });
  }

  const rowMap = new Map<string, GoalOverviewRow>();
  let orphanRecordCount = 0;

  const ensureRow = (path: string | null | undefined, item?: Item): GoalOverviewRow | null => {
    const normalizedPath = normalizeGoalPathValue(path);
    if (!normalizedPath) return null;
    const goal = goalsByPath.get(normalizedPath);
    const existing = rowMap.get(normalizedPath);
    if (existing) return existing;
    const row: GoalOverviewRow = {
      goalId: goal?.id ?? null,
      title: goal?.title || titleFromPath(normalizedPath),
      goalPath: normalizedPath,
      themePath: goal?.themePath ?? (item ? readThemePath(item) : null),
      icon: String((goal as any)?.icon ?? (item ? readLooseField(item, '图标') ?? readLooseField(item, 'icon') ?? '' : '')).trim() || null,
      status: goal?.status,
      totalCount: 0,
      taskCount: 0,
      openTaskCount: 0,
      doneTaskCount: 0,
      planCount: 0,
      reviewCount: 0,
      habitCount: 0,
      evidenceCount: 0,
      blockerCount: 0,
      milestoneCount: 0,
      thoughtCount: 0,
      latestDate: null,
      completionRatio: 0,
      recentItems: [],
      coreBlockCounts: {},
      activeCycle: activeCycleByGoalPath.get(normalizedPath) || null,
      metricProgress: [],
    };
    rowMap.set(normalizedPath, row);
    return row;
  };

  for (const goal of goals) {
    const path = normalizeGoalPathValue(goal.goalPath || goal.title);
    if (path) ensureRow(path);
  }

  for (const item of items) {
    const paths = readGoalPaths(item);
    if (!paths.length) {
      orphanRecordCount += 1;
      continue;
    }
    const date = normalizeDate((item as any).date ?? readLooseField(item, '日期') ?? readLooseField(item, 'date'));
    const coreBlock = readCoreBlock(item).replace(/^core\./, '');
    for (const path of paths) {
      const row = ensureRow(path, item);
      if (!row) continue;
      row.totalCount += 1;
      row.coreBlockCounts[coreBlock] = (row.coreBlockCounts[coreBlock] || 0) + 1;
      if (!row.themePath) row.themePath = readThemePath(item);
      if (date && (!row.latestDate || date > row.latestDate)) row.latestDate = date;
      if (row.recentItems.length < 20) row.recentItems.push(item);

      if (coreBlock === 'task') {
        row.taskCount += 1;
        if (isDoneTask(item)) row.doneTaskCount += 1;
        else row.openTaskCount += 1;
      } else if (coreBlock === 'plan') row.planCount += 1;
      else if (coreBlock === 'review') row.reviewCount += 1;
      else if (coreBlock === 'habit') row.habitCount += 1;
      else if (coreBlock === 'evidence') row.evidenceCount += 1;
      else if (coreBlock === 'blocker') row.blockerCount += 1;
      else if (coreBlock === 'milestone') row.milestoneCount += 1;
      else if (coreBlock === 'thought') row.thoughtCount += 1;
    }
  }

  const goalOrder = createGoalOrderIndex(goals);
  const rows = Array.from(rowMap.values()).map((row) => {
    const goal = goalsByPath.get(row.goalPath);
    const nextRow: GoalOverviewRow = {
      ...row,
      completionRatio: row.taskCount > 0 ? row.doneTaskCount / row.taskCount : 0,
      recentItems: row.recentItems
        .slice()
        .sort((a, b) => String((b as any).date ?? '').localeCompare(String((a as any).date ?? ''), 'zh-CN'))
        .slice(0, 8),
    };
    nextRow.metricProgress = (goal?.metrics || []).map((metric) => metricProgress(metric, nextRow));
    return nextRow;
  }).sort((a, b) => {
    const byGoal = goalOrder.compareGoalPaths(a.goalPath, b.goalPath);
    if (byGoal !== 0) return byGoal;
    return a.goalPath.localeCompare(b.goalPath, 'zh-CN');
  });

  const selectedRow = selectedGoalPath ? rows.find((row) => row.goalPath === selectedGoalPath) || null : null;
  return {
    rows: selectedRow ? [selectedRow] : rows.slice(0, limit),
    selectedGoalPath,
    selectedRow,
    totalGoals: rows.length,
    totalRecords: items.length,
    orphanRecordCount,
  };
}
