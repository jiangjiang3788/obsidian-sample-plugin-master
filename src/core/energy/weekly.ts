import type { Item } from '../types/schema';
import { buildEnergyEffects, type EnergyEffectAggregate } from './effects';
import { isEnergyItem, readEnergyItemSnapshot } from './item';
import { buildEnergyPatterns } from './patterns';
import type { EnergyDaypartPattern } from './patternTypes';
import { buildEnergyTimeline } from './timeline';
import { energyDateFromOrdinal, energyDateOrdinal, energyDayBalancedMeans, energyMedian, filterItemsByDateWindow, roundEnergyMean } from './weeklySupport';
import { weeklyFindingFromEffect, type BuildEnergyWeeklyReviewOptions, type EnergyWeeklyReview } from './weeklyTypes';

function latestEnergyDate(items: Item[]): string | undefined {
  return items
    .filter(isEnergyItem)
    .map((item) => readEnergyItemSnapshot(item)?.date || '')
    .filter(Boolean)
    .sort()
    .at(-1);
}

function mostUsefulDaypart(rows: EnergyDaypartPattern[] | undefined, direction: 'best' | 'lowest') {
  const eligible = (rows || []).filter((row) => row.sampleCount >= 2 && row.meanScore != null);
  if (eligible.length === 0) return undefined;
  return [...eligible].sort((left, right) => direction === 'best'
    ? (right.meanScore || 0) - (left.meanScore || 0)
    : (left.meanScore || 0) - (right.meanScore || 0))[0];
}

function bestActivity(rows: EnergyEffectAggregate[] | undefined, trend: 'recovery' | 'depletion') {
  const eligible = (rows || []).filter((row) => row.trend === trend && row.sampleCount >= 3 && row.evidence !== 'insufficient');
  if (eligible.length === 0) return undefined;
  return [...eligible].sort((left, right) => {
    if (right.sampleCount !== left.sampleCount) return right.sampleCount - left.sampleCount;
    return trend === 'recovery' ? right.meanDelta - left.meanDelta : left.meanDelta - right.meanDelta;
  })[0];
}

function observationLines(review: Omit<EnergyWeeklyReview, 'observations' | 'disclaimer'>): string[] {
  const rows: string[] = [];
  const coveragePct = Math.round(review.coverage.coverageRatio * 100);
  rows.push(`本周 ${review.coverage.sampledDays}/${review.windowDays} 天有采样（${coveragePct}%），共 ${review.metrics.sampleCount} 次。`);
  if (review.metrics.meanScore != null) rows.push(`综合精力平均 ${review.metrics.meanScore}，中位数 ${review.metrics.medianScore ?? '—'}。`);
  if (review.bestDaypart && review.lowestDaypart && review.bestDaypart.key !== review.lowestDaypart.key) {
    rows.push(`采样中较高时段是 ${review.bestDaypart.label}（均值 ${review.bestDaypart.meanScore}），较低时段是 ${review.lowestDaypart.label}（均值 ${review.lowestDaypart.meanScore}）。`);
  }
  if (review.topRecovery) rows.push(`恢复候选：${review.topRecovery.label}，平均 Δ${review.topRecovery.meanDelta >= 0 ? '+' : ''}${review.topRecovery.meanDelta}，N=${review.topRecovery.sampleCount}。`);
  if (review.topDepletion) rows.push(`消耗候选：${review.topDepletion.label}，平均 Δ${review.topDepletion.meanDelta >= 0 ? '+' : ''}${review.topDepletion.meanDelta}，N=${review.topDepletion.sampleCount}。`);
  if (review.longWork?.pairedSessionCount && review.longWork.meanDelta != null) rows.push(`≥120min 连续工作可配对 N=${review.longWork.pairedSessionCount}，平均 Δ${review.longWork.meanDelta >= 0 ? '+' : ''}${review.longWork.meanDelta}。`);
  return rows;
}

/** Build a sparse-data-safe rolling weekly review ending on the latest valid Energy sample by default. */
export function buildEnergyWeeklyReview(items: Item[], options: BuildEnergyWeeklyReviewOptions = {}): EnergyWeeklyReview | null {
  const windowDays = Math.max(3, Math.min(14, Math.floor(options.windowDays ?? 7)));
  const endDate = options.endDate && energyDateOrdinal(options.endDate) != null ? options.endDate : latestEnergyDate(items);
  if (!endDate) return null;
  const endOrdinal = energyDateOrdinal(endDate);
  if (endOrdinal == null) return null;
  const startDate = energyDateFromOrdinal(endOrdinal - windowDays + 1);
  const windowItems = filterItemsByDateWindow(items, startDate, endDate);
  const evidenceRecords = filterItemsByDateWindow(options.evidenceRecords || items, startDate, endDate);
  const timeline = buildEnergyTimeline(windowItems, { windowDays, endDate });
  if (!timeline) return null;

  const snapshots = windowItems.filter(isEnergyItem).map(readEnergyItemSnapshot).filter((row): row is NonNullable<typeof row> => !!row);
  const dailyScoreMeans = energyDayBalancedMeans(snapshots, 'score');
  const dailyBrainMeans = energyDayBalancedMeans(snapshots, 'brainScore');
  const dailyPhysicalMeans = energyDayBalancedMeans(snapshots, 'physicalScore');
  const effects = buildEnergyEffects(evidenceRecords);
  const patterns = buildEnergyPatterns(windowItems, { activityRecords: evidenceRecords, analysisWindowDays: windowDays });
  const recovery = bestActivity(effects?.byActivity, 'recovery');
  const depletion = bestActivity(effects?.byActivity, 'depletion');
  const longWork = patterns?.continuousWork.find((row) => row.key === 'ge120');

  const base = {
    windowDays,
    startDate,
    endDate,
    coverage: timeline.coverage,
    metrics: {
      sampleCount: snapshots.length,
      sampledDays: timeline.coverage.sampledDays,
      meanScore: roundEnergyMean(dailyScoreMeans),
      medianScore: energyMedian(dailyScoreMeans),
      meanBrainScore: roundEnergyMean(dailyBrainMeans),
      meanPhysicalScore: roundEnergyMean(dailyPhysicalMeans),
      realtimeSamples: timeline.coverage.realtimeSamples,
      retrospectiveSamples: timeline.coverage.retrospectiveSamples,
      detailedSamples: timeline.coverage.detailedSamples,
    },
    bestDaypart: mostUsefulDaypart(patterns?.dayparts, 'best'),
    lowestDaypart: mostUsefulDaypart(patterns?.dayparts, 'lowest'),
    topRecovery: recovery ? weeklyFindingFromEffect(recovery) : undefined,
    topDepletion: depletion ? weeklyFindingFromEffect(depletion) : undefined,
    longWork: longWork ? {
      label: longWork.label,
      sessionCount: longWork.sessionCount,
      pairedSessionCount: longWork.pairedSessionCount,
      meanDelta: longWork.meanDelta,
      medianDelta: longWork.medianDelta,
      evidence: longWork.evidence,
    } : undefined,
    stopProxy: patterns?.stopProxy,
    readiness: {
      sufficientCoverage: timeline.coverage.sampledDays >= 4,
      sufficientSamples: snapshots.length >= 7,
      message: timeline.coverage.sampledDays >= 4 && snapshots.length >= 7
        ? '本周覆盖和样本量足以形成一份观察性周复盘。'
        : `当前 ${timeline.coverage.sampledDays}/${windowDays} 天有采样、${snapshots.length} 次记录；结论应继续视为观察中。`,
    },
  };
  return {
    ...base,
    observations: observationLines(base),
    disclaimer: '周复盘基于个人稀疏记录与时间邻近关系，只用于自我观察，不代表因果或医学结论。',
  };
}
