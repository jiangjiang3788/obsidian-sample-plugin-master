import type { RecordViewItem } from '@/core/records/RecordEntity';
import { asTaskSessionRecord } from '../records/task/taskSession';
import { classifyEnergyActivity } from './effects';
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
  bySeriesId: Map<string, EnergyActionHistoricalEffect>;
  byActivity: Map<string, EnergyActionHistoricalEffect>;
  byTheme: Map<string, EnergyActionHistoricalEffect>;
  recoveryActivities: EnergyRecoveryLibraryEntry[];
  depletionActivities: EnergyRecoveryLibraryEntry[];
}

interface FeedbackRow {
  taskId: string;
  seriesId?: string;
  activity: string;
  theme?: string;
  delta: number;
  brainDelta?: number;
  physicalDelta?: number;
  durationMinutes?: number;
}

function text(value: unknown): string { return String(value ?? '').trim(); }
function normalized(value: unknown): string { return text(value).toLowerCase().replace(/\s+/g, ' '); }
function finiteNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
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

function aggregate(rows: FeedbackRow[], keyOf: (row: FeedbackRow) => string): Map<string, EnergyActionHistoricalEffect> {
  const grouped = new Map<string, FeedbackRow[]>();
  for (const row of rows) {
    const key = normalized(keyOf(row));
    if (!key) continue;
    grouped.set(key, [...(grouped.get(key) || []), row]);
  }
  return new Map([...grouped.entries()].map(([key, group]) => [key, {
    meanDelta: mean(group.map((row) => row.delta)) || 0,
    sampleCount: group.length,
    meanBrainDelta: mean(group.flatMap((row) => row.brainDelta == null ? [] : [row.brainDelta])),
    meanPhysicalDelta: mean(group.flatMap((row) => row.physicalDelta == null ? [] : [row.physicalDelta])),
    typicalDurationMinutes: median(group.flatMap((row) => row.durationMinutes == null ? [] : [row.durationMinutes])),
    origin: 'recommendation-feedback' as const,
  }]));
}

function buildFeedbackRows(items: RecordViewItem[]): FeedbackRow[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const rows: FeedbackRow[] = [];
  for (const item of items) {
    const session = asTaskSessionRecord(item);
    if (!session || !session.endEnergyRecordId) continue;
    const delta = finiteNumber(session.energyDelta);
    if (delta == null) continue;
    const task = byId.get(session.taskId);
    const theme = text(session.themePath || task?.themePath || task?.theme) || undefined;
    const activity = task ? classifyEnergyActivity(task) : (theme || '未分类活动');
    rows.push({
      taskId: session.taskId,
      seriesId: session.seriesId || task?.seriesId,
      activity,
      theme,
      delta,
      brainDelta: finiteNumber(session.brainDelta),
      physicalDelta: finiteNumber(session.physicalDelta),
      durationMinutes: finiteNumber(session.sessionDurationMinutes),
    });
  }
  return rows;
}

function recoveryEntries(
  effects: Map<string, EnergyActionHistoricalEffect>,
  trend: 'recovery' | 'depletion',
): EnergyRecoveryLibraryEntry[] {
  return [...effects.entries()].flatMap(([key, effect]) => {
    if (effect.sampleCount < 3) return [];
    if (trend === 'recovery' && effect.meanDelta < 8) return [];
    if (trend === 'depletion' && effect.meanDelta > -8) return [];
    return [{ ...effect, key, label: key, typicalDurationMinutes: effect.typicalDurationMinutes }];
  }).sort((left, right) => Math.abs(right.meanDelta) - Math.abs(left.meanDelta) || right.sampleCount - left.sampleCount);
}

/** Persistent TaskSession feedback is the only recommendation-execution history source. */
export function buildEnergyRecommendationLearning(items: RecordViewItem[]): EnergyRecommendationLearningModel {
  const rows = buildFeedbackRows(items);
  const byTaskId = aggregate(rows, (row) => row.taskId);
  const bySeriesId = aggregate(rows.filter((row) => !!row.seriesId), (row) => row.seriesId || '');
  const byActivity = aggregate(rows, (row) => row.activity);
  const byTheme = aggregate(rows.filter((row) => !!row.theme), (row) => row.theme || '');
  return {
    feedbackSampleCount: rows.length,
    pairedActivityCount: rows.length,
    byTaskId,
    bySeriesId,
    byActivity,
    byTheme,
    recoveryActivities: recoveryEntries(byActivity, 'recovery'),
    depletionActivities: recoveryEntries(byActivity, 'depletion'),
  };
}

export function attachEnergyRecommendationLearning(
  candidates: EnergyActionCandidate[],
  learning: EnergyRecommendationLearningModel,
): EnergyActionCandidate[] {
  return candidates.map((candidate) => {
    const taskEffect = learning.byTaskId.get(normalized(candidate.id));
    const seriesEffect = candidate.seriesId ? learning.bySeriesId.get(normalized(candidate.seriesId)) : undefined;
    const themeEffect = candidate.theme ? learning.byTheme.get(normalized(candidate.theme)) : undefined;
    const activityEffect = candidate.activityLabel ? learning.byActivity.get(normalized(candidate.activityLabel)) : undefined;
    const historicalEffect = taskEffect && taskEffect.sampleCount >= 3 ? taskEffect
      : seriesEffect && seriesEffect.sampleCount >= 3 ? seriesEffect
      : themeEffect && themeEffect.sampleCount >= 3 ? themeEffect
      : activityEffect && activityEffect.sampleCount >= 3 ? activityEffect
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
