import { buildEnergyEffects, energySnapshotOccurrenceKey, readEnergyItemSnapshot, resolveEnergyContext } from '@core/energy/public';
import type { RecordViewItem } from '@core/types/public';

export interface GoalEnergyActivityContextModel {
  id: string;
  title: string;
  relation: 'active' | 'recent';
  confidence: 'high' | 'medium' | 'low';
  gapMinutes: number;
  durationMinutes?: number;
  item: RecordViewItem;
}

export interface GoalEnergyDailySignalModel {
  id: string;
  kind: 'sleep' | 'body' | 'exercise';
  label: string;
  value?: string | number;
  item: RecordViewItem;
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
  item: RecordViewItem;
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

export interface GoalEnergyTimelineCoverageModel {
  sampledDays: number;
  missingDays: number;
  totalSamples: number;
}

export interface GoalEnergyTimelineModel {
  startDate: string;
  endDate: string;
  coverage: GoalEnergyTimelineCoverageModel;
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
  timeline?: GoalEnergyTimelineModel;
  effects?: GoalEnergyEffectsModel | null;
}

export function buildGoalEnergyContext(item: RecordViewItem, goalItems: RecordViewItem[]): GoalEnergyContextModel | null {
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

function buildGoalEnergyEffects(evidenceRecords: RecordViewItem[]): GoalEnergyEffectsModel | null {
  const effects = buildEnergyEffects(evidenceRecords);
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


function buildSevenDayEnergyTimeline(rows: Array<GoalEnergySampleModel & { occurrenceKey: string }>): GoalEnergyTimelineModel | undefined {
  const endDate = rows.find((row) => row.date)?.date || null;
  if (!endDate) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(endDate);
  if (!match) return undefined;
  const end = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const dateText = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const startDate = dateText(start);
  const windowRows = rows.filter((row) => !!row.date && row.date >= startDate && row.date <= endDate);
  const sampledDays = new Set(windowRows.map((row) => row.date).filter(Boolean)).size;
  return {
    startDate,
    endDate,
    coverage: {
      sampledDays,
      missingDays: Math.max(0, 7 - sampledDays),
      totalSamples: windowRows.length,
    },
  };
}

export function buildGoalEnergySummary(
  items: RecordViewItem[],
  limit: number = 5,
  options: { contextRecords?: RecordViewItem[]; effectRecords?: RecordViewItem[] } = {},
): GoalEnergySummaryModel | null {
  const contextRecords = options.contextRecords || items;
  const effectRecords = options.effectRecords || contextRecords;
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
    context: buildGoalEnergyContext(row.item, contextRecords),
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
    timeline: buildSevenDayEnergyTimeline(ordered),
    effects: buildGoalEnergyEffects(effectRecords),
  };
}
