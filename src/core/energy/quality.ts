import type { Item } from '../types/schema';
import { buildEnergyEffects } from './effects';
import { isEnergyItem, readEnergyItemSnapshot } from './item';

export type EnergyDataQualityLevel = 'limited' | 'usable' | 'strong';

export interface EnergyDataQualityModel {
  level: EnergyDataQualityLevel;
  levelLabel: string;
  totalDays: number;
  sampledDays: number;
  coverageRatio: number;
  sampleCount: number;
  realtimeSamples: number;
  retrospectiveSamples: number;
  exactTimeSamples: number;
  approximateTimeSamples: number;
  detailedSamples: number;
  pairedActivityCount: number;
  highConfidencePairCount: number;
  mediumConfidencePairCount: number;
  message: string;
  gaps: string[];
}

export interface BuildEnergyDataQualityOptions {
  startDate: string;
  endDate: string;
  effectRecords?: Item[];
}

function ordinal(value: string): number | undefined {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  const stamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const date = new Date(stamp);
  if (date.toISOString().slice(0, 10) !== value) return undefined;
  return Math.floor(stamp / 86_400_000);
}

function ratio(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 1000) / 1000;
}

function pct(value: number): number {
  return Math.round(value * 100);
}

/**
 * Data-quality projection for user-facing Energy conclusions.
 * It reports what the data can support; it never fills missing days or upgrades retrospective
 * records to exact-time evidence.
 */
export function buildEnergyDataQuality(items: Item[], options: BuildEnergyDataQualityOptions): EnergyDataQualityModel {
  const start = ordinal(options.startDate);
  const end = ordinal(options.endDate);
  const totalDays = start == null || end == null || end < start ? 0 : end - start + 1;
  const snapshots = items
    .filter(isEnergyItem)
    .map((item) => ({ item, snapshot: readEnergyItemSnapshot(item) }))
    .filter((row): row is { item: Item; snapshot: NonNullable<ReturnType<typeof readEnergyItemSnapshot>> } => !!row.snapshot)
    .filter(({ snapshot }) => {
      if (!snapshot.date) return false;
      const value = ordinal(snapshot.date);
      return start != null && end != null && value != null && value >= start && value <= end;
    });

  const sampledDays = new Set(snapshots.map(({ snapshot }) => snapshot.date).filter(Boolean)).size;
  const realtimeSamples = snapshots.filter(({ snapshot }) => snapshot.captureMode !== 'retrospective').length;
  const retrospectiveSamples = snapshots.filter(({ snapshot }) => snapshot.captureMode === 'retrospective').length;
  const exactTimeSamples = snapshots.filter(({ snapshot }) => {
    if (snapshot.timePrecision === 'exact') return true;
    return !snapshot.timePrecision && snapshot.captureMode !== 'retrospective' && Boolean(snapshot.time);
  }).length;
  const approximateTimeSamples = snapshots.length - exactTimeSamples;
  const detailedSamples = snapshots.filter(({ snapshot }) => snapshot.brainScore != null && snapshot.physicalScore != null).length;
  const effects = buildEnergyEffects(options.effectRecords || items);
  const coverageRatio = ratio(sampledDays, totalDays);
  const realtimeRatio = ratio(realtimeSamples, snapshots.length);
  const exactRatio = ratio(exactTimeSamples, snapshots.length);
  const pairedActivityCount = effects?.pairedActivityCount || 0;
  const highConfidencePairCount = effects?.highConfidencePairCount || 0;
  const mediumConfidencePairCount = effects?.mediumConfidencePairCount || 0;

  let level: EnergyDataQualityLevel = 'limited';
  if (sampledDays >= Math.min(7, Math.max(4, Math.ceil(totalDays * 0.6))) && snapshots.length >= 8 && coverageRatio >= 0.6 && exactRatio >= 0.6) {
    level = 'strong';
  } else if (sampledDays >= Math.min(3, Math.max(2, totalDays)) && snapshots.length >= 4) {
    level = 'usable';
  }

  const gaps: string[] = [];
  if (sampledDays < Math.min(3, totalDays || 3)) gaps.push(`只有 ${sampledDays}/${totalDays || '—'} 天有记录`);
  else if (coverageRatio < 0.5) gaps.push(`覆盖率 ${pct(coverageRatio)}%`);
  if (snapshots.length > 0 && realtimeRatio < 0.5) gaps.push(`实时记录仅 ${pct(realtimeRatio)}%`);
  if (snapshots.length > 0 && exactRatio < 0.5) gaps.push(`精确时间仅 ${pct(exactRatio)}%`);
  if (pairedActivityCount < 3) gaps.push(`活动前后有效配对 ${pairedActivityCount}`);

  const levelLabel = level === 'strong' ? '较可靠' : level === 'usable' ? '可观察' : '数据不足';
  const message = level === 'strong'
    ? `本周期 ${sampledDays}/${totalDays} 天有记录（${pct(coverageRatio)}%），可以形成观察性模式；仍不把时间邻近关系当因果。`
    : level === 'usable'
      ? `本周期 ${sampledDays}/${totalDays} 天有记录（${pct(coverageRatio)}%）；可以看趋势，但个人规律仍需更多重复样本。`
      : `本周期 ${sampledDays}/${totalDays || '—'} 天有记录；先把地图当作状态记录，不强行形成规律。`;

  return {
    level,
    levelLabel,
    totalDays,
    sampledDays,
    coverageRatio,
    sampleCount: snapshots.length,
    realtimeSamples,
    retrospectiveSamples,
    exactTimeSamples,
    approximateTimeSamples,
    detailedSamples,
    pairedActivityCount,
    highConfidencePairCount,
    mediumConfidencePairCount,
    message,
    gaps,
  };
}
