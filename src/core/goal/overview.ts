import type { Item } from '@/core/types/schema';
import type { CycleDefinition, GoalDefinition, GoalMetricContract, GoalRecordRelation, GoalRecordRelationType } from './types';
import { splitGoalPath } from './path';

export interface GoalMigrationCandidate {
  id: string;
  title: string;
  goalPath: string;
  themePath?: string | null;
  count: number;
  firstDate?: string | null;
  lastDate?: string | null;
  source: 'existing-goal' | 'legacy-record' | 'mixed';
  sampleItemIds: string[];
  coreBlockCounts: Record<string, number>;
}

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
  status: CycleDefinition['status'];
  granularity: CycleDefinition['granularity'];
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
  activeCycle?: GoalOverviewCycleSummary | null;
  metricProgress?: GoalOverviewMetricProgress[];
}

export interface GoalMarkdownBackfillPreviewItem {
  itemId: string;
  goalPath: string;
  goalId: string;
  themePath?: string | null;
  coreBlock: string;
  missingFields: string[];
  previewInline: string;
  /** 可直接写回的键值。 */
  patchFields: Record<string, string>;
}

export interface GoalMarkdownBackfillDiffItem extends GoalMarkdownBackfillPreviewItem {
  beforeSnippet: string;
  afterSnippet: string;
}

export interface GoalMarkdownBackfillDiffPreview {
  total: number;
  items: GoalMarkdownBackfillDiffItem[];
  missingGoalIdCount: number;
  missingCoreBlockCount: number;
}

export interface GoalMarkdownBackfillPreview {
  total: number;
  items: GoalMarkdownBackfillPreviewItem[];
  missingGoalIdCount: number;
  missingCoreBlockCount: number;
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
  if (/闪念|思考/.test(category)) return 'thought';
  return category || 'record';
}

function isDoneTask(item: Item): boolean {
  const raw = String((item as any).rawSource ?? (item as any).fullData ?? item.content ?? item.title ?? '').trim();
  return /^-\s*\[[xX]\]/.test(raw) || /完成/.test(String(readLooseField(item, '状态') ?? ''));
}

function relationTypeFromCoreBlock(coreBlock: string): GoalRecordRelationType {
  const normalized = coreBlock.replace(/^core\./, '') as GoalRecordRelationType;
  if (['task', 'plan', 'review', 'habit', 'thought', 'evidence', 'blocker', 'milestone', 'progress', 'feedback'].includes(normalized)) return normalized;
  return 'progress';
}

export function inferGoalCandidatesFromItems(items: Item[], existingGoals: GoalDefinition[] = []): GoalMigrationCandidate[] {
  const map = new Map<string, GoalMigrationCandidate>();

  for (const goal of existingGoals || []) {
    const goalPath = splitGoalPath(goal.goalPath || goal.title).goalPath;
    if (!goalPath) continue;
    map.set(goalPath, {
      id: goal.id || makeStableGoalIdFromPath(goalPath),
      title: goal.title || titleFromPath(goalPath),
      goalPath,
      themePath: goal.themePath ?? null,
      count: 0,
      firstDate: null,
      lastDate: null,
      source: 'existing-goal',
      sampleItemIds: [],
      coreBlockCounts: {},
    });
  }

  for (const item of items || []) {
    const paths = readGoalPaths(item);
    if (!paths.length) continue;
    const date = normalizeDate((item as any).date ?? readLooseField(item, '日期') ?? readLooseField(item, 'date'));
    const themePath = readThemePath(item);
    const coreBlock = readCoreBlock(item);

    for (const path of paths) {
      const candidate = map.get(path) || {
        id: makeStableGoalIdFromPath(path),
        title: titleFromPath(path),
        goalPath: path,
        themePath,
        count: 0,
        firstDate: null,
        lastDate: null,
        source: 'legacy-record' as const,
        sampleItemIds: [],
        coreBlockCounts: {},
      };
      candidate.count += 1;
      if (!candidate.themePath && themePath) candidate.themePath = themePath;
      if (date && (!candidate.firstDate || date < candidate.firstDate)) candidate.firstDate = date;
      if (date && (!candidate.lastDate || date > candidate.lastDate)) candidate.lastDate = date;
      if (candidate.sampleItemIds.length < 5) candidate.sampleItemIds.push(item.id);
      candidate.coreBlockCounts[coreBlock] = (candidate.coreBlockCounts[coreBlock] || 0) + 1;
      if (candidate.source === 'existing-goal') candidate.source = 'mixed';
      map.set(path, candidate);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count || a.goalPath.localeCompare(b.goalPath, 'zh-CN'));
}

export function buildGoalRelationsFromItems(items: Item[], goals: GoalDefinition[]): GoalRecordRelation[] {
  const goalsByPath = new Map<string, GoalDefinition>();
  for (const goal of goals || []) {
    const goalPath = splitGoalPath(goal.goalPath || goal.title).goalPath;
    if (goalPath) goalsByPath.set(goalPath, goal);
  }

  const relations: GoalRecordRelation[] = [];
  const seen = new Set<string>();
  for (const item of items || []) {
    for (const path of readGoalPaths(item)) {
      const goal = goalsByPath.get(path);
      if (!goal) continue;
      const coreBlock = readCoreBlock(item);
      const key = `${goal.id}::${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      relations.push({
        id: `rel.${goal.id}.${item.id}`,
        goalId: goal.id,
        itemId: item.id,
        recordId: item.id,
        relationType: relationTypeFromCoreBlock(coreBlock),
        weight: 1,
        createdAt: new Date().toISOString(),
      });
    }
  }
  return relations;
}


function dateToEpochDay(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(time) ? Math.floor(time / 86400000) : null;
}

function summarizeCycle(cycle: CycleDefinition, today = new Date()): GoalOverviewCycleSummary {
  const start = dateToEpochDay(cycle.startDate);
  const end = dateToEpochDay(cycle.endDate);
  const now = Math.floor(new Date(today.toISOString().slice(0, 10) + 'T00:00:00').getTime() / 86400000);
  const total = start !== null && end !== null ? Math.max(1, end - start + 1) : 1;
  const elapsed = start !== null ? Math.max(0, Math.min(total, now - start + 1)) : 0;
  return {
    id: cycle.id,
    title: cycle.title,
    status: cycle.status,
    granularity: cycle.granularity,
    startDate: cycle.startDate,
    endDate: cycle.endDate,
    isActive: cycle.status === 'active',
    isOverdue: end !== null ? now > end && cycle.status !== 'closed' : false,
    dayProgressRatio: total > 0 ? elapsed / total : 0,
  };
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

export function buildGoalMarkdownBackfillPreview(items: Item[], goals: GoalDefinition[] = [], limit = 20): GoalMarkdownBackfillPreview {
  const goalsByPath = new Map<string, GoalDefinition>();
  for (const goal of goals || []) {
    const path = splitGoalPath(goal.goalPath || goal.title).goalPath;
    if (path) goalsByPath.set(path, goal);
  }
  const preview: GoalMarkdownBackfillPreviewItem[] = [];
  let missingGoalIdCount = 0;
  let missingCoreBlockCount = 0;

  for (const item of items || []) {
    const paths = readGoalPaths(item);
    if (!paths.length) continue;
    const existingGoalId = String((item as any).goalId ?? readLooseField(item, '目标ID') ?? '').trim();
    const existingCoreBlock = String((item as any).coreBlock ?? readLooseField(item, '核心Block') ?? '').trim();
    for (const path of paths) {
      const goal = goalsByPath.get(path);
      if (!goal) continue;
      const coreBlock = readCoreBlock(item).replace(/^core\./, '');
      const missingFields: string[] = [];
      if (!existingGoalId) {
        missingFields.push('目标ID');
        missingGoalIdCount += 1;
      }
      if (!existingCoreBlock) {
        missingFields.push('核心Block');
        missingCoreBlockCount += 1;
      }
      if (!missingFields.length) continue;
      const themePath = goal.themePath ?? readThemePath(item);
      const patchFields: Record<string, string> = {
        '目标ID': goal.id,
        '目标': path,
        '核心Block': coreBlock,
      };
      if (themePath) patchFields['主题'] = themePath;
      preview.push({
        itemId: item.id,
        goalPath: path,
        goalId: goal.id,
        themePath,
        coreBlock,
        missingFields,
        patchFields,
        previewInline: Object.entries(patchFields).map(([key, value]) => `(${key}::${value})`).join(' '),
      });
      break;
    }
  }

  return { total: preview.length, items: preview.slice(0, limit), missingGoalIdCount, missingCoreBlockCount };
}


function upsertPreviewInlineFields(line: string, fields: Record<string, string>): string {
  let next = String(line || '').trim();
  for (const [key, value] of Object.entries(fields || {})) {
    const normalizedKey = String(key || '').trim();
    const normalizedValue = String(value ?? '').trim();
    if (!normalizedKey || !normalizedValue) continue;
    const escapedKey = normalizedKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`([\\(\\[]\\s*${escapedKey}::\\s*)[^\\)\\]]*(\\s*[\\)\\]])`);
    if (pattern.test(next)) next = next.replace(pattern, `$1${normalizedValue}$2`);
    else next = `${next} (${normalizedKey}::${normalizedValue})`;
  }
  return next;
}

export function buildGoalMarkdownBackfillDiffPreview(items: Item[], goals: GoalDefinition[] = [], limit = 20): GoalMarkdownBackfillDiffPreview {
  const preview = buildGoalMarkdownBackfillPreview(items, goals, limit);
  const itemsById = new Map((items || []).map((item) => [item.id, item]));
  return {
    ...preview,
    items: preview.items.map((entry) => {
      const item = itemsById.get(entry.itemId);
      const beforeSnippet = String((item as any)?.rawSource ?? (item as any)?.fullData ?? item?.content ?? item?.title ?? entry.itemId).split('\n')[0] || entry.itemId;
      return {
        ...entry,
        beforeSnippet,
        afterSnippet: upsertPreviewInlineFields(beforeSnippet, entry.patchFields),
      };
    }),
  };
}

export function buildGoalOverviewModel(input: {
  items: Item[];
  goals?: GoalDefinition[];
  cycles?: CycleDefinition[];
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
  for (const cycle of input.cycles || []) {
    const path = goalPathById.get(cycle.goalId);
    if (!path || cycle.status === 'closed') continue;
    const summary = summarizeCycle(cycle);
    const current = activeCycleByGoalPath.get(path);
    if (!current || (summary.isActive && !current.isActive) || String(summary.startDate).localeCompare(String(current.startDate), 'zh-CN') > 0) {
      activeCycleByGoalPath.set(path, summary);
    }
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
    const dateCompare = String(b.latestDate || '').localeCompare(String(a.latestDate || ''), 'zh-CN');
    if (dateCompare !== 0) return dateCompare;
    return b.totalCount - a.totalCount || a.goalPath.localeCompare(b.goalPath, 'zh-CN');
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
