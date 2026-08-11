import type { Item, TimerState } from '@core/types/public';
import type { GoalDefinition } from '@core/goal/public';
import { createGoalOrderIndex } from '@core/goal/public';
import { getTaskCadence, TASK_CADENCE_META, TASK_CADENCE_ORDER, type TaskCadenceKey } from '@core/records/public';
import { isTaskCompleted, isTaskOpen, cleanTaskText, dayjs } from '@core/utils/public';
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
  item: Item;
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
  item: Item;
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

function taskTitle(item: Item): string {
  const raw = text(item.editableText || item.content || item.title);
  return cleanTaskText(raw) || text(item.title) || '未命名任务';
}

function normalizedGoalPath(item: Item): string {
  return text(item.goalPath || item.goalPaths?.[0] || item.goalId);
}

function goalLabel(item: Item): string {
  return normalizedGoalPath(item) || '未分目标';
}

function recurrenceText(item: Item): string {
  return text(item.recurrence);
}

function aggregateKey(item: Item): string {
  return [taskTitle(item).toLowerCase(), goalLabel(item).toLowerCase(), recurrenceText(item).toLowerCase()].join('::');
}

function recordTime(item: Item): string {
  return text(item.endTime || item.startTime || item.doneDate);
}

function historyMap(items: Item[], today: string): Map<string, EnergyTaskRecordVM[]> {
  const start = dayjs(today).subtract(365, 'day').startOf('day');
  const end = dayjs(today).endOf('day');
  const map = new Map<string, EnergyTaskRecordVM[]>();
  for (const item of items) {
    if (item.type !== 'task' || !isTaskCompleted(item) || !item.doneDate) continue;
    const done = dayjs(item.doneDate);
    if (!done.isValid() || done.isBefore(start) || done.isAfter(end)) continue;
    const key = aggregateKey(item);
    const rows = map.get(key) || [];
    rows.push({ id: item.id, doneDate: item.doneDate, timeLabel: recordTime(item), item });
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
  items: Item[];
  historyItems: Item[];
  timers: TimerState[];
  management: EnergyManagementModel | null;
  goals?: GoalDefinition[];
  today: string;
}): EnergyTaskListModel {
  const { items, historyItems, timers, management, goals = [], today } = args;
  const openTasks = items.filter((item) => item.type === 'task' && isTaskOpen(item));
  const visibleItems = openTasks;
  const visibleIds = new Set(visibleItems.map((item) => item.id));
  const records = historyMap(items, today);

  const candidateBuild = buildEnergyActionCandidateResult(items, {
    today,
    maximumCandidates: 1000,
    includeRecurringTasks: true,
    includeFutureTasks: true,
  });
  const taskCandidates = candidateBuild.candidates.filter((candidate) => candidate.source === 'task' && visibleIds.has(candidate.id));
  const learning = buildEnergyRecommendationLearning(historyItems, timers);
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
      actionPolicy: buildEnergyActionPolicyContext(items, management, today),
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

  const goalBuckets = new Map<string, {
    label: string;
    goalPath?: string;
    rows: Map<EnergyTaskCadenceKey, EnergyTaskListItemVM[]>;
  }>();

  for (const item of visibleItems) {
    const goalPath = normalizedGoalPath(item) || undefined;
    const label = goalLabel(item);
    const goalKey = goalPath || '__unassigned__';
    const cadence = getTaskCadence(item);
    const key = aggregateKey(item);
    const history = records.get(key) || [];
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
    .map(([key, bucket]) => ({
      key,
      label: bucket.label,
      goalPath: bucket.goalPath,
      rows: TASK_CADENCE_ORDER.flatMap((cadence) => {
        const tasks = bucket.rows.get(cadence) || [];
        return tasks.length > 0 ? [{ key: cadence, ...TASK_CADENCE_META[cadence], tasks }] : [];
      }),
      taskCount: Array.from(bucket.rows.values()).reduce((sum, tasks) => sum + tasks.length, 0),
    }));

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
