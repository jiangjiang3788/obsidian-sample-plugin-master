import type { Item } from '../types/schema';
import type { TimerState } from '../types/timer';
import { buildEnergyEffects, classifyEnergyActivity, type EnergyEffectAggregate } from './effects';
import type { EnergyActionCandidate, EnergyActionHistoricalEffect } from './recommendationTypes';

export type EnergyLearningOrigin = 'recommendation-feedback' | 'activity-history';

export interface EnergyRecoveryLibraryEntry extends EnergyActionHistoricalEffect {
  key: string;
  label: string;
  typicalDurationMinutes?: number;
}

export interface EnergyRecommendationLearningModel {
  feedbackSampleCount: number;
  pairedActivityCount: number;
  byTaskId: Map<string, EnergyActionHistoricalEffect>;
  byActivity: Map<string, EnergyActionHistoricalEffect>;
  byTheme: Map<string, EnergyActionHistoricalEffect>;
  recoveryActivities: EnergyRecoveryLibraryEntry[];
  depletionActivities: EnergyRecoveryLibraryEntry[];
}

interface FeedbackRow {
  taskId: string;
  activity: string;
  theme?: string;
  delta: number;
  brainDelta?: number;
  physicalDelta?: number;
  durationMinutes?: number;
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function normalized(value: unknown): string {
  return text(value).toLowerCase().replace(/\s+/g, ' ');
}

function mean(values: number[]): number | undefined {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return undefined;
  return Math.round((finite.reduce((sum, value) => sum + value, 0) / finite.length) * 10) / 10;
}

function median(values: number[]): number | undefined {
  const finite = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!finite.length) return undefined;
  const middle = Math.floor(finite.length / 2);
  const value = finite.length % 2 ? finite[middle] : (finite[middle - 1] + finite[middle]) / 2;
  return Math.round(value);
}

function aggregateFeedback(rows: FeedbackRow[], keyOf: (row: FeedbackRow) => string): Map<string, EnergyActionHistoricalEffect> {
  const grouped = new Map<string, FeedbackRow[]>();
  for (const row of rows) {
    const key = normalized(keyOf(row));
    if (!key) continue;
    grouped.set(key, [...(grouped.get(key) || []), row]);
  }
  return new Map([...grouped.entries()].map(([key, group]) => {
    const brain = group.map((row) => row.brainDelta).filter((value): value is number => value != null);
    const physical = group.map((row) => row.physicalDelta).filter((value): value is number => value != null);
    return [key, {
      meanDelta: mean(group.map((row) => row.delta)) || 0,
      sampleCount: group.length,
      meanBrainDelta: mean(brain),
      meanPhysicalDelta: mean(physical),
      typicalDurationMinutes: median(group.map((row) => row.durationMinutes || 0)),
      origin: 'recommendation-feedback' as const,
    }];
  }));
}

function feedbackRows(items: Item[], timers: TimerState[]): FeedbackRow[] {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const rows: FeedbackRow[] = [];
  for (const timer of timers) {
    const feedback = timer.energyFeedback;
    const energyContext = timer.energyContext;
    if (timer.status !== 'feedback-recorded' || !feedback || !energyContext) continue;
    const item = itemById.get(timer.taskId);
    if (!item) continue;
    const brainDelta = feedback.brainScore != null && energyContext.baselineBrainScore != null
      ? feedback.brainScore - energyContext.baselineBrainScore
      : undefined;
    const physicalDelta = feedback.physicalScore != null && energyContext.baselinePhysicalScore != null
      ? feedback.physicalScore - energyContext.baselinePhysicalScore
      : undefined;
    const elapsedMinutes = Math.round((timer.elapsedSeconds || 0) / 60);
    rows.push({
      taskId: timer.taskId,
      activity: classifyEnergyActivity(item),
      theme: text(item.themePath || item.theme) || undefined,
      delta: feedback.delta,
      brainDelta,
      physicalDelta,
      durationMinutes: elapsedMinutes > 0 ? elapsedMinutes : energyContext.suggestedDurationMinutes,
    });
  }
  return rows;
}

function effectFromAggregate(row: EnergyEffectAggregate): EnergyActionHistoricalEffect {
  return {
    meanDelta: row.meanDelta,
    sampleCount: row.sampleCount,
    meanBrainDelta: row.meanBrainDelta,
    meanPhysicalDelta: row.meanPhysicalDelta,
    typicalDurationMinutes: row.meanDurationMinutes ? Math.round(row.meanDurationMinutes) : undefined,
    origin: 'activity-history',
  };
}

function effectMap(rows: EnergyEffectAggregate[]): Map<string, EnergyActionHistoricalEffect> {
  return new Map(rows.map((row) => [normalized(row.label), effectFromAggregate(row)]));
}

function recoveryEntries(
  activityRows: EnergyEffectAggregate[],
  feedbackActivity: Map<string, EnergyActionHistoricalEffect>,
  trend: 'recovery' | 'depletion',
): EnergyRecoveryLibraryEntry[] {
  const labels = new Set<string>();
  for (const row of activityRows) labels.add(normalized(row.label));
  for (const key of feedbackActivity.keys()) labels.add(key);

  const rows: EnergyRecoveryLibraryEntry[] = [];
  for (const key of labels) {
    const feedback = feedbackActivity.get(key);
    const observedRow = activityRows.find((row) => normalized(row.label) === key);
    const observed = observedRow ? effectFromAggregate(observedRow) : undefined;
    const chosen = feedback && feedback.sampleCount >= 3 ? feedback : observed;
    if (!chosen || chosen.sampleCount < 3) continue;
    if (trend === 'recovery' && chosen.meanDelta < 8) continue;
    if (trend === 'depletion' && chosen.meanDelta > -8) continue;
    rows.push({
      ...chosen,
      key,
      label: observedRow?.label || key,
      typicalDurationMinutes: chosen.typicalDurationMinutes || (observedRow?.meanDurationMinutes ? Math.round(observedRow.meanDurationMinutes) : undefined),
    });
  }
  return rows.sort((left, right) => {
    const originDelta = Number(right.origin === 'recommendation-feedback') - Number(left.origin === 'recommendation-feedback');
    if (originDelta) return originDelta;
    const magnitude = Math.abs(right.meanDelta) - Math.abs(left.meanDelta);
    if (magnitude) return magnitude;
    return right.sampleCount - left.sampleCount;
  });
}

/**
 * Builds one global personal-evidence model for recommendation decisions.
 * Energy is a person-level state; Goal is storage/action context, so this model intentionally
 * uses global task↔Energy effects while preserving per-task identity for recommendation feedback.
 */
export function buildEnergyRecommendationLearning(items: Item[], timers: TimerState[] = []): EnergyRecommendationLearningModel {
  const effects = buildEnergyEffects(items, { requireSharedGoal: false });
  const rows = feedbackRows(items, timers);
  const feedbackByTask = aggregateFeedback(rows, (row) => row.taskId);
  const feedbackByActivity = aggregateFeedback(rows, (row) => row.activity);
  const feedbackByTheme = aggregateFeedback(rows.filter((row) => !!row.theme), (row) => row.theme || '');
  const activityRows = effects?.byActivity || [];
  const activityHistory = effectMap(activityRows);
  const themeHistory = effectMap(effects?.byTheme || []);

  const byActivity = new Map(activityHistory);
  for (const [key, effect] of feedbackByActivity) {
    if (effect.sampleCount >= 3) byActivity.set(key, effect);
  }
  const byTheme = new Map(themeHistory);
  for (const [key, effect] of feedbackByTheme) {
    if (effect.sampleCount >= 3) byTheme.set(key, effect);
  }

  return {
    feedbackSampleCount: rows.length,
    pairedActivityCount: effects?.pairedActivityCount || 0,
    byTaskId: feedbackByTask,
    byActivity,
    byTheme,
    recoveryActivities: recoveryEntries(activityRows, feedbackByActivity, 'recovery'),
    depletionActivities: recoveryEntries(activityRows, feedbackByActivity, 'depletion'),
  };
}

export function attachEnergyRecommendationLearning(
  candidates: EnergyActionCandidate[],
  learning: EnergyRecommendationLearningModel,
): EnergyActionCandidate[] {
  return candidates.map((candidate) => {
    const taskEffect = learning.byTaskId.get(normalized(candidate.id));
    const activityEffect = candidate.activityLabel ? learning.byActivity.get(normalized(candidate.activityLabel)) : undefined;
    const themeEffect = candidate.theme ? learning.byTheme.get(normalized(candidate.theme)) : undefined;
    const historicalEffect = taskEffect && taskEffect.sampleCount >= 3
      ? taskEffect
      : activityEffect && activityEffect.sampleCount >= 3
        ? activityEffect
        : themeEffect && themeEffect.sampleCount >= 3
          ? themeEffect
          : undefined;
    return historicalEffect ? { ...candidate, historicalEffect } : candidate;
  });
}

export function buildEnergyRecoveryActionCandidates(
  learning: EnergyRecommendationLearningModel,
  maximum = 3,
): EnergyActionCandidate[] {
  return learning.recoveryActivities.slice(0, Math.max(1, maximum)).map((entry) => ({
    id: `recovery:${entry.key}`,
    title: entry.label,
    source: 'activity',
    activityLabel: entry.label,
    durationMinutes: Math.max(10, Math.min(60, entry.typicalDurationMinutes || 20)),
    valueScore: 45,
    recoveryIntent: true,
    historicalEffect: entry,
  }));
}
