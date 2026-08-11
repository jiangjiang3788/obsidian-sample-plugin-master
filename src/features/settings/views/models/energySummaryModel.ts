import { buildEnergyEffects, energySnapshotOccurrenceKey, readEnergyItemSnapshot, resolveEnergyContext } from '@core/energy/public';
import type { Item } from '@core/types/public';

export interface GoalEnergyActivityContextModel {
  id: string;
  title: string;
  relation: 'active' | 'recent';
  confidence: 'high' | 'medium' | 'low';
  gapMinutes: number;
  durationMinutes?: number;
  item: Item;
}

export interface GoalEnergyDailySignalModel {
  id: string;
  kind: 'sleep' | 'body' | 'exercise';
  label: string;
  value?: string | number;
  item: Item;
}

export interface GoalEnergyContextModel {
  activity?: GoalEnergyActivityContextModel;
  dailySignals: GoalEnergyDailySignalModel[];
}

export interface GoalEnergySampleModel {
  id: string;
  score: number;
  quickLevel: number;
  brainScore?: number;
  physicalScore?: number;
  scoreMode?: string;
  date?: string | null;
  time?: string | null;
  context?: GoalEnergyContextModel | null;
  item: Item;
}

export interface GoalEnergyEffectRowModel {
  key: string;
  label: string;
  sampleCount: number;
  meanDelta: number;
  medianDelta: number;
  meanBrainDelta?: number;
  meanPhysicalDelta?: number;
  meanDurationMinutes: number;
  trend: 'recovery' | 'depletion' | 'mixed' | 'insufficient';
  evidence: 'insufficient' | 'exploratory' | 'supported';
}

export interface GoalEnergyEffectsModel {
  eligibleActivityCount: number;
  pairedActivityCount: number;
  highConfidencePairCount: number;
  mediumConfidencePairCount: number;
  excludedActivityCount: number;
  byActivity: GoalEnergyEffectRowModel[];
  byTheme: GoalEnergyEffectRowModel[];
  byDuration: GoalEnergyEffectRowModel[];
}

export interface GoalEnergySummaryModel {
  count: number;
  latestScore: number;
  latestQuickLevel: number;
  latestBrainScore?: number;
  latestPhysicalScore?: number;
  latestScoreMode?: string;
  latestDate?: string | null;
  latestTime?: string | null;
  recentSamples: GoalEnergySampleModel[];
  effects?: GoalEnergyEffectsModel | null;
}

export function buildGoalEnergyContext(item: Item, goalItems: Item[]): GoalEnergyContextModel | null {
  const context = resolveEnergyContext(item, goalItems);
  if (!context) return null;
  return {
    activity: context.primaryActivity ? {
      id: context.primaryActivity.itemId,
      title: context.primaryActivity.title,
      relation: context.primaryActivity.relation,
      confidence: context.primaryActivity.confidence,
      gapMinutes: context.primaryActivity.gapMinutes,
      durationMinutes: context.primaryActivity.durationMinutes,
      item: context.primaryActivity.item,
    } : undefined,
    dailySignals: context.dailySignals.map((signal) => ({
      id: signal.itemId,
      kind: signal.kind,
      label: signal.label,
      value: signal.value,
      item: signal.item,
    })),
  };
}

function buildGoalEnergyEffects(items: Item[]): GoalEnergyEffectsModel | null {
  const effects = buildEnergyEffects(items);
  if (!effects) return null;
  const mapRows = (rows: typeof effects.byActivity): GoalEnergyEffectRowModel[] => rows.slice(0, 6).map((row) => ({
    key: row.key,
    label: row.label,
    sampleCount: row.sampleCount,
    meanDelta: row.meanDelta,
    medianDelta: row.medianDelta,
    meanBrainDelta: row.meanBrainDelta,
    meanPhysicalDelta: row.meanPhysicalDelta,
    meanDurationMinutes: row.meanDurationMinutes,
    trend: row.trend,
    evidence: row.evidence,
  }));
  return {
    eligibleActivityCount: effects.eligibleActivityCount,
    pairedActivityCount: effects.pairedActivityCount,
    highConfidencePairCount: effects.highConfidencePairCount,
    mediumConfidencePairCount: effects.mediumConfidencePairCount,
    excludedActivityCount: effects.excludedActivityCount,
    byActivity: mapRows(effects.byActivity),
    byTheme: mapRows(effects.byTheme),
    byDuration: mapRows(effects.byDuration),
  };
}

export function buildGoalEnergySummary(items: Item[], limit: number = 5): GoalEnergySummaryModel | null {
  const ordered = items.reduce<Array<GoalEnergySampleModel & { occurrenceKey: string }>>((rows, item) => {
    const snapshot = readEnergyItemSnapshot(item);
    if (!snapshot) return rows;
    rows.push({
      id: item.id,
      score: snapshot.score,
      quickLevel: snapshot.quickLevel,
      brainScore: snapshot.brainScore,
      physicalScore: snapshot.physicalScore,
      scoreMode: snapshot.scoreMode,
      date: snapshot.date || null,
      time: snapshot.time || null,
      item,
      occurrenceKey: energySnapshotOccurrenceKey(snapshot),
    });
    return rows;
  }, []).sort((left, right) => right.occurrenceKey.localeCompare(left.occurrenceKey));

  if (ordered.length === 0) return null;
  const recentSamples = ordered.slice(0, limit).map(({ occurrenceKey: _occurrenceKey, ...row }) => ({
    ...row,
    context: buildGoalEnergyContext(row.item, items),
  }));
  const latest = recentSamples[0];
  return {
    count: ordered.length,
    latestScore: latest.score,
    latestQuickLevel: latest.quickLevel,
    latestBrainScore: latest.brainScore,
    latestPhysicalScore: latest.physicalScore,
    latestScoreMode: latest.scoreMode,
    latestDate: latest.date || null,
    latestTime: latest.time || null,
    recentSamples,
    effects: buildGoalEnergyEffects(items),
  };
}
