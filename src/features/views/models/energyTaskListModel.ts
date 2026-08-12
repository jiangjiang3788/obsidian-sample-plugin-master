import type { RecordViewItem, TimerState } from '@core/types/public';
import type { GoalDefinition } from '@core/goal/public';
import { createGoalOrderIndex } from '@core/goal/public';
import { getTaskCadence, TASK_CADENCE_META, TASK_CADENCE_ORDER, type TaskCadenceKey } from '@core/records/public';
import { isTaskOpen, dayjs } from '@core/utils/public';
import { formatTaskRecurrence } from '@core/records/public';
import {
  attachEnergyRecommendationEvidence,
  attachEnergyRecommendationLearning,
  buildEnergyActionCandidateResult,
  buildEnergyActionPolicyContext,
  buildEnergyActionRecommendations,
  buildEnergyRecommendationLearning,
  type EnergyManagementModel,
} from '@core/energy/public';

export type EnergyTaskCadenceKey = TaskCadenceKey;

export interface EnergyTaskRecordVM {
  id: string;
  doneDate?: string;
  timeLabel: string;
  item: RecordViewItem;
}

export interface EnergyTaskListItemVM {
  key: string;
  itemId: string;
  title: string;
  goalLabel: string;
  goalPath?: string;
  cadence: EnergyTaskCadenceKey;
  recurring: boolean;
  recurrenceLabel: string;
  count: number;
  records: EnergyTaskRecordVM[];
  suggestedDurationMinutes: number;
  energyFitScore?: number;
  energyMatched: boolean;
  item: RecordViewItem;
}

export interface EnergyTaskCadenceRowVM {
  key: EnergyTaskCadenceKey;
  label: string;
  emoji: string;
  tasks: EnergyTaskListItemVM[];
}

export interface EnergyTaskGoalVM {
  key: string;
  label: string;
  goalPath?: string;
  rows: EnergyTaskCadenceRowVM[];
  taskCount: number;
}

export interface EnergyTaskListModel {
  goals: EnergyTaskGoalVM[];
  latestEnergy?: {
    score: number;
    brainScore?: number;
    physicalScore?: number;
    date?: string;
    time?: string;
  };
  diagnostics: {
    openTaskCount: number;
    visibleTaskCount: number;
    goalCount: number;
  };
}


function text(value: unknown): string {
  return String(value ?? '').trim();
}

function taskTitle(item: RecordViewItem): string {
  const raw = text(item.editableText || item.content || item.title);
  return raw || text(item.title) || '未命名任务';
}

function buildGoalMap(goals: GoalDefinition[]): Map<string, GoalDefinition> {
  return new Map((goals || []).map((goal) => [goal.id, goal] as const));
}

function resolveTaskGoal(item: RecordViewItem, goalsById: Map<string, GoalDefinition>): { key: string; path?: string; label: string } {
  const goalId = text(item.goalId);
  if (!goalId) return { key: '__unassigned__', label: '未分目标' };
  const goal = goalsById.get(goalId);
  const path = text(goal?.goalPath || item.goalPath) || undefined;
  const label = text(goal?.title || path) || '未分目标';
  return { key: goalId, path, label };
}

function completionIdentity(item: RecordViewItem): string {
  const seriesId = text(item.seriesId);
  return seriesId ? `series:${seriesId}` : `task:${item.id}`;
}

function recurrenceText(item: RecordViewItem): string {
  return text(formatTaskRecurrence(item.recurrenceInfo));
}

function localCompletionDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function localCompletionTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * Energy task history is completion history, not execution-session history.
 * - current layout dateRange owns the visible count
 * - recurring identity is stable seriesId
 * - TaskSession remains execution evidence for Energy learning elsewhere
 */
function completionHistoryMap(
  records: RecordViewItem[],
  dateRange: [Date, Date],
): Map<string, EnergyTaskRecordVM[]> {
  const start = dayjs(dateRange[0]);
  const end = dayjs(dateRange[1]);
  const map = new Map<string, EnergyTaskRecordVM[]>();

  for (const item of records) {
    if (item.coreBlock !== 'task' || item.status !== 'done') continue;
    const completedAt = text(item.completedAt || item.doneDate);
    if (!completedAt) continue;
    const occurred = dayjs(completedAt);
    if (!occurred.isValid() || occurred.isBefore(start) || occurred.isAfter(end)) continue;

    const key = completionIdentity(item);
    const rows = map.get(key) || [];
    rows.push({
      id: item.id,
      doneDate: localCompletionDate(completedAt),
      timeLabel: localCompletionTime(completedAt),
      item,
    });
    map.set(key, rows);
  }

  for (const rows of map.values()) {
    rows.sort((a, b) => `${b.doneDate || ''} ${b.timeLabel}`.localeCompare(`${a.doneDate || ''} ${a.timeLabel}`, 'zh-CN'));
  }
  return map;
}

function emptyCadenceMap(): Map<EnergyTaskCadenceKey, EnergyTaskListItemVM[]> {
  return new Map(TASK_CADENCE_ORDER.map((key) => [key, []]));
}

export function buildEnergyTaskListModel(args: {
  items: RecordViewItem[];
  historyItems: RecordViewItem[];
  timers: TimerState[];
  management: EnergyManagementModel | null;
  goals?: GoalDefinition[];
  today: string;
  dateRange: [Date, Date];
}): EnergyTaskListModel {
  const { items, historyItems, management, goals = [], today, dateRange } = args;
  const openTasks = items.filter((item) => item.coreBlock === 'task' && isTaskOpen(item));
  const visibleItems = openTasks;
  const visibleIds = new Set(visibleItems.map((item) => item.id));
  const completionHistory = completionHistoryMap(historyItems, dateRange);

  const candidateBuild = buildEnergyActionCandidateResult(items, {
    today,
    maximumCandidates: 1000,
    includeRecurringTasks: true,
    includeFutureTasks: true,
    historyRecords: historyItems,
  });
  const taskCandidates = candidateBuild.candidates.filter((candidate) => candidate.source === 'task' && visibleIds.has(candidate.id));
  const learning = buildEnergyRecommendationLearning(historyItems);
  const learned = attachEnergyRecommendationLearning(taskCandidates, learning);
  const enriched = attachEnergyRecommendationEvidence(learned, management);

  let rankedIds: string[] = enriched.map((candidate) => candidate.id);
  const actionById = new Map<string, ReturnType<typeof buildEnergyActionRecommendations>['recommendations'][number]>();
  if (management?.latest && enriched.length > 0) {
    const ranked = buildEnergyActionRecommendations({
      score: management.latest.score,
      brainScore: management.latest.brainScore,
      physicalScore: management.latest.physicalScore,
      maximumRecommendations: Math.min(500, enriched.length),
      actionPolicy: buildEnergyActionPolicyContext(historyItems, management, today),
    }, enriched);
    rankedIds = ranked.recommendations.map((row) => row.candidate.id);
    for (const row of ranked.recommendations) actionById.set(row.candidate.id, row);
  }
  const rank = new Map(rankedIds.map((id, index) => [id, index]));
  const candidateById = new Map(enriched.map((candidate) => [candidate.id, candidate]));

  // A star is a lightweight UI signal, not a second recommendation list. Only mark
  // tasks for which Energy has an actual signal (explicit load metadata or personal
  // effect evidence), and keep the marker global so it remains meaningful across
  // Goal/cadence groups.
  const energyMatchedIds = new Set<string>();
  if (management?.latest) {
    const matchable = Array.from(actionById.values())
      .filter((row) => {
        const candidate = row.candidate;
        return !!candidate.brainLoad || !!candidate.physicalLoad || !!candidate.historicalEffect;
      })
      .sort((left, right) => right.fitScore - left.fitScore)
      .slice(0, 5);
    for (const row of matchable) energyMatchedIds.add(row.candidate.id);
  }

  const goalsById = buildGoalMap(goals);
  const goalBuckets = new Map<string, {
    label: string;
    goalPath?: string;
    rows: Map<EnergyTaskCadenceKey, EnergyTaskListItemVM[]>;
  }>();

  for (const item of visibleItems) {
    const resolvedGoal = resolveTaskGoal(item, goalsById);
    const goalPath = resolvedGoal.path;
    const label = resolvedGoal.label;
    const goalKey = resolvedGoal.key;
    const cadence = getTaskCadence(item);
    const history = completionHistory.get(completionIdentity(item)) || [];
    const action = actionById.get(item.id);
    const candidate = candidateById.get(item.id);
    let bucket = goalBuckets.get(goalKey);
    if (!bucket) {
      bucket = { label, goalPath, rows: emptyCadenceMap() };
      goalBuckets.set(goalKey, bucket);
    }
    bucket.rows.get(cadence)!.push({
      key: item.id,
      itemId: item.id,
      title: taskTitle(item),
      goalLabel: label,
      goalPath,
      cadence,
      recurring: cadence !== 'routine',
      recurrenceLabel: recurrenceText(item),
      count: history.length,
      records: history,
      suggestedDurationMinutes: action?.suggestedDurationMinutes || candidate?.durationMinutes || 30,
      energyFitScore: action?.fitScore,
      energyMatched: energyMatchedIds.has(item.id),
      item,
    });
  }

  for (const bucket of goalBuckets.values()) {
    for (const tasks of bucket.rows.values()) {
      tasks.sort((left, right) => {
        const leftRank = rank.get(left.itemId) ?? Number.MAX_SAFE_INTEGER;
        const rightRank = rank.get(right.itemId) ?? Number.MAX_SAFE_INTEGER;
        return leftRank - rightRank || left.title.localeCompare(right.title, 'zh-CN');
      });
    }
  }

  // Desktop UX final: Energy may reorder tasks inside a cadence row, but it must not
  // make whole Goal sections jump whenever the current Energy changes. Goal order is
  // the canonical settings order used by the rest of Think OS.
  const goalOrder = createGoalOrderIndex(goals);
  const goalModels: EnergyTaskGoalVM[] = Array.from(goalBuckets.entries())
    .sort(([, left], [, right]) => goalOrder.compareGoalPaths(left.goalPath || left.label, right.goalPath || right.label))
    .map(([key, bucket]) => {
      const rows = TASK_CADENCE_ORDER
        .map((cadence) => ({
          key: cadence,
          ...TASK_CADENCE_META[cadence],
          tasks: bucket.rows.get(cadence) || [],
        }))
        .filter((row) => row.tasks.length > 0);
      const taskCount = rows.reduce((sum, row) => sum + row.tasks.length, 0);
      return {
        key,
        label: bucket.label,
        goalPath: bucket.goalPath,
        rows,
        taskCount,
      };
    })
    .filter((goal) => goal.taskCount > 0);

  return {
    goals: goalModels,
    latestEnergy: management?.latest ? {
      score: management.latest.score,
      brainScore: management.latest.brainScore,
      physicalScore: management.latest.physicalScore,
      date: management.latest.date,
      time: management.latest.time,
    } : undefined,
    diagnostics: {
      openTaskCount: openTasks.length,
      visibleTaskCount: goalModels.reduce((sum, goal) => sum + goal.taskCount, 0),
      goalCount: goalModels.length,
    },
  };
}
