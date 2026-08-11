import type { Item } from '../types/schema';
import { isEnergyItem, readEnergyItemSnapshot } from './item';
import { buildEnergyTimeline } from './timeline';
import type { EnergyExperimentComparison, EnergyExperimentConfig, EnergyExperimentPeriodSummary, EnergyExperimentTrend } from './experimentTypes';
import { energyDateFromOrdinal, energyDateOrdinal, energyDayBalancedMeans, energyMedian, filterItemsByDateWindow, roundEnergyMean } from './weeklySupport';

function roundDelta(after?: number, before?: number): number | undefined {
  if (after == null || before == null) return undefined;
  return Math.round((after - before) * 10) / 10;
}

function summarizePeriod(items: Item[], label: EnergyExperimentPeriodSummary['label'], startDate: string, endDate: string, windowDays: number): EnergyExperimentPeriodSummary {
  const periodItems = filterItemsByDateWindow(items, startDate, endDate);
  const snapshots = periodItems.filter(isEnergyItem).map(readEnergyItemSnapshot).filter((row): row is NonNullable<typeof row> => !!row);
  const dailyScoreMeans = energyDayBalancedMeans(snapshots, 'score');
  const dailyBrainMeans = energyDayBalancedMeans(snapshots, 'brainScore');
  const dailyPhysicalMeans = energyDayBalancedMeans(snapshots, 'physicalScore');
  const timeline = buildEnergyTimeline(periodItems, { windowDays, endDate });
  return {
    label,
    startDate,
    endDate,
    windowDays,
    sampleCount: snapshots.length,
    sampledDays: timeline?.coverage.sampledDays || 0,
    missingDays: windowDays - (timeline?.coverage.sampledDays || 0),
    meanScore: roundEnergyMean(dailyScoreMeans),
    medianScore: energyMedian(dailyScoreMeans),
    meanBrainScore: roundEnergyMean(dailyBrainMeans),
    meanPhysicalScore: roundEnergyMean(dailyPhysicalMeans),
    detailedSamples: snapshots.filter((row) => row.brainScore != null && row.physicalScore != null).length,
  };
}

function experimentTrend(delta?: number): EnergyExperimentTrend {
  if (delta == null) return 'insufficient';
  if (delta >= 5) return 'up';
  if (delta <= -5) return 'down';
  return 'stable';
}

/** Compare one configurable intervention window with the immediately preceding baseline window. */
export function buildEnergyExperimentComparison(items: Item[], config: EnergyExperimentConfig): EnergyExperimentComparison | null {
  const interventionOrdinal = energyDateOrdinal(String(config.interventionDate || '').trim());
  const name = String(config.name || '').trim();
  if (!name || interventionOrdinal == null) return null;
  const windowDays = Math.max(3, Math.min(30, Math.floor(config.windowDays ?? 7)));
  const baselineStart = energyDateFromOrdinal(interventionOrdinal - windowDays);
  const baselineEnd = energyDateFromOrdinal(interventionOrdinal - 1);
  const interventionStart = energyDateFromOrdinal(interventionOrdinal);
  const interventionEnd = energyDateFromOrdinal(interventionOrdinal + windowDays - 1);
  const baseline = summarizePeriod(items, 'baseline', baselineStart, baselineEnd, windowDays);
  const intervention = summarizePeriod(items, 'intervention', interventionStart, interventionEnd, windowDays);
  const deltaMeanScore = roundDelta(intervention.meanScore, baseline.meanScore);
  const deltaMeanBrainScore = roundDelta(intervention.meanBrainScore, baseline.meanBrainScore);
  const deltaMeanPhysicalScore = roundDelta(intervention.meanPhysicalScore, baseline.meanPhysicalScore);
  const enough = (row: EnergyExperimentPeriodSummary) => row.sampledDays >= 3 && row.sampleCount >= 5;
  const readiness = enough(baseline) && enough(intervention) ? 'ready' : 'collecting';
  return {
    name,
    hypothesis: String(config.hypothesis || '').trim() || undefined,
    interventionDate: interventionStart,
    windowDays,
    baseline,
    intervention,
    deltaMeanScore,
    deltaMeanBrainScore,
    deltaMeanPhysicalScore,
    readiness,
    trend: readiness === 'ready' ? experimentTrend(deltaMeanScore) : 'insufficient',
    message: readiness === 'ready'
      ? `两边都达到至少 3 个采样日和 5 个样本，可以进行观察性前后比较。`
      : `基线 ${baseline.sampledDays}/${windowDays} 天、N=${baseline.sampleCount}；干预 ${intervention.sampledDays}/${windowDays} 天、N=${intervention.sampleCount}。两边都达到 3 个采样日且 N≥5 后再判断。`,
    disclaimer: 'N-of-1 前后比较只能说明同一人的时间段差异；仍可能受睡眠、工作量、季节和其他同期变化影响，不代表干预造成了变化。',
  };
}
