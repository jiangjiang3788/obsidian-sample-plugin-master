import type { RecordViewItem } from '@/core/records/RecordEntity';
import { isEnergyItem, readEnergyItemSnapshot } from './item';
import { asTaskSessionRecord } from '../records/task/taskSession';

export type EnergyEffectConfidence = 'high' | 'medium';
export type EnergyEffectEvidence = 'insufficient' | 'exploratory' | 'supported';
export type EnergyEffectTrend = 'recovery' | 'depletion' | 'mixed' | 'insufficient';
export type EnergyEffectDimension = 'activity' | 'theme' | 'duration';

export interface EnergyEffectEndpoint {
  itemId: string;
  date: string;
  time: string;
  score: number;
  brainScore?: number;
  physicalScore?: number;
  item: RecordViewItem;
}

export interface EnergyActivityEffectSample {
  activityItemId: string;
  activityTitle: string;
  activityLabel: string;
  themeLabel: string;
  durationBucket: string;
  durationMinutes: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  before: EnergyEffectEndpoint;
  after: EnergyEffectEndpoint;
  beforeGapMinutes: number;
  afterGapMinutes: number;
  deltaScore: number;
  deltaBrain?: number;
  deltaPhysical?: number;
  confidence: EnergyEffectConfidence;
  item: RecordViewItem;
}

export interface EnergyEffectAggregate {
  dimension: EnergyEffectDimension;
  key: string;
  label: string;
  sampleCount: number;
  meanDelta: number;
  medianDelta: number;
  meanBrainDelta?: number;
  meanPhysicalDelta?: number;
  meanDurationMinutes: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  trend: EnergyEffectTrend;
  evidence: EnergyEffectEvidence;
}

export interface EnergyEffectAnalytics {
  eligibleActivityCount: number;
  pairedActivityCount: number;
  highConfidencePairCount: number;
  mediumConfidencePairCount: number;
  excludedActivityCount: number;
  samples: EnergyActivityEffectSample[];
  byActivity: EnergyEffectAggregate[];
  byTheme: EnergyEffectAggregate[];
  byDuration: EnergyEffectAggregate[];
}

export interface BuildEnergyEffectsOptions {
  maxBeforeGapMinutes?: number;
  maxAfterGapMinutes?: number;
  highBeforeGapMinutes?: number;
  highAfterGapMinutes?: number;
  minimumTrendSamples?: number;
  supportedTrendSamples?: number;
}

interface TimedEnergyPoint extends EnergyEffectEndpoint {
  absoluteMinute: number;
}

interface ActivityInterval {
  item: RecordViewItem;
  startAbsolute: number;
  endAbsolute: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  durationMinutes: number;
}

const DEFAULT_HIGH_BEFORE_GAP = 60;
const DEFAULT_HIGH_AFTER_GAP = 30;
const DEFAULT_MINIMUM_TREND_SAMPLES = 3;
const DEFAULT_SUPPORTED_TREND_SAMPLES = 5;

function readEffectText(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text || undefined;
}

function effectAbsoluteMinute(date: string, time: string): number | undefined {
  const stamp = Date.parse(`${date}T${time.length === 5 ? `${time}:00` : time}`);
  return Number.isFinite(stamp) ? stamp / 60000 : undefined;
}


function localDateTimeFromMs(stamp: number): { date: string; time: string } {
  const value = new Date(stamp);
  const date = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const time = `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  return { date, time };
}

function resolveEffectActivityInterval(item: RecordViewItem, byId: Map<string, RecordViewItem>): ActivityInterval | null {
  const session = asTaskSessionRecord(item);
  if (!session) return null;
  const startMs = Date.parse(session.sessionStartedAt);
  const endMs = Date.parse(session.sessionEndedAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  const task = byId.get(session.taskId);
  const activityItem: RecordViewItem = task ? {
    ...task,
    id: session.id,
    goalId: session.goalId || task.goalId,
    goalPath: session.goalPath || task.goalPath,
    themePath: session.themePath || task.themePath,
    duration: session.sessionDurationMinutes,
  } : session;
  const start = localDateTimeFromMs(startMs);
  const end = localDateTimeFromMs(endMs);
  return {
    item: activityItem,
    startAbsolute: startMs / 60000,
    endAbsolute: endMs / 60000,
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    durationMinutes: Math.max(1, Math.round(session.sessionDurationMinutes)),
  };
}


function readEffectEnergyPoint(item: RecordViewItem): TimedEnergyPoint | null {
  if (!isEnergyItem(item)) return null;
  const snapshot = readEnergyItemSnapshot(item);
  if (!snapshot?.date || !snapshot.time) return null;
  const absoluteMinute = effectAbsoluteMinute(snapshot.date, snapshot.time);
  if (absoluteMinute == null) return null;
  return {
    itemId: item.id,
    date: snapshot.date,
    time: snapshot.time,
    score: snapshot.score,
    brainScore: snapshot.brainScore,
    physicalScore: snapshot.physicalScore,
    item,
    absoluteMinute,
  };
}

function activityTitle(item: RecordViewItem): string {
  return readEffectText(item.title) || readEffectText(item.content) || '未命名任务';
}

export function classifyEnergyActivity(item: RecordViewItem): string {
  const text = [item.title, item.content, item.themePath, item.theme, item.leafTheme, item.rootTheme]
    .map((value) => String(value || ''))
    .join(' ');
  if (/代码|编码|编程|开发|插件|debug|调试/i.test(text)) return '代码 / 开发';
  if (/会议|开会|沟通|讨论|同步/.test(text)) return '会议 / 沟通';
  if (/读书|阅读|看书|学习|课程/.test(text)) return '阅读 / 学习';
  if (/写作|记录|总结|复盘|笔记/.test(text)) return '写作 / 记录';
  if (/午睡|睡觉|睡眠|补觉/.test(text)) return '睡眠 / 午睡';
  if (/运动|锻炼|健身|跑步|散步|八段锦|瑜伽|骑行|游泳/.test(text)) return '运动 / 活动';
  if (/手机|抖音|短视频|刷视频|刷手机/.test(text)) return '手机 / 短视频';
  if (/吃饭|早餐|午饭|晚饭|餐|做饭/.test(text)) return '饮食';
  if (/孩子|陪娃|陪.*玩|家庭|家人/.test(text)) return '家庭 / 陪伴';
  if (/家务|打扫|收拾|整理/.test(text)) return '家务 / 整理';
  return activityTitle(item).slice(0, 24);
}

function effectThemeLabel(item: RecordViewItem): string {
  return readEffectText(item.themePath) || readEffectText(item.theme) || readEffectText(item.rootTheme) || readEffectText(item.leafTheme) || '未标主题';
}

function effectDurationBucket(durationMinutes: number): string {
  if (durationMinutes < 30) return '<30min';
  if (durationMinutes < 60) return '30–59min';
  if (durationMinutes < 90) return '60–89min';
  if (durationMinutes < 120) return '90–119min';
  return '≥120min';
}

function effectConfidence(beforeGap: number, afterGap: number, options: Required<Pick<BuildEnergyEffectsOptions, 'highBeforeGapMinutes' | 'highAfterGapMinutes'>>): EnergyEffectConfidence {
  return beforeGap <= options.highBeforeGapMinutes && afterGap <= options.highAfterGapMinutes ? 'high' : 'medium';
}

function medianEffect(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function meanEffect(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function roundedEffect(value: number): number {
  return Math.round(value * 10) / 10;
}

function aggregateEffectRows(
  samples: EnergyActivityEffectSample[],
  dimension: EnergyEffectDimension,
  keyOf: (sample: EnergyActivityEffectSample) => string,
  minimumTrendSamples: number,
  supportedTrendSamples: number,
): EnergyEffectAggregate[] {
  const groups = new Map<string, EnergyActivityEffectSample[]>();
  for (const sample of samples) {
    const key = keyOf(sample);
    const bucket = groups.get(key) || [];
    bucket.push(sample);
    groups.set(key, bucket);
  }

  return [...groups.entries()].map(([key, rows]) => {
    const deltas = rows.map((row) => row.deltaScore);
    const brainDeltas = rows.map((row) => row.deltaBrain).filter((value): value is number => value != null);
    const physicalDeltas = rows.map((row) => row.deltaPhysical).filter((value): value is number => value != null);
    const meanDelta = meanEffect(deltas);
    const medianDelta = medianEffect(deltas);
    const evidence: EnergyEffectEvidence = rows.length < minimumTrendSamples
      ? 'insufficient'
      : rows.length < supportedTrendSamples ? 'exploratory' : 'supported';
    let trend: EnergyEffectTrend = 'insufficient';
    if (evidence !== 'insufficient') {
      if (meanDelta >= 8 && medianDelta >= 5) trend = 'recovery';
      else if (meanDelta <= -8 && medianDelta <= -5) trend = 'depletion';
      else trend = 'mixed';
    }
    return {
      dimension,
      key,
      label: key,
      sampleCount: rows.length,
      meanDelta: roundedEffect(meanDelta),
      medianDelta: roundedEffect(medianDelta),
      meanBrainDelta: brainDeltas.length ? roundedEffect(meanEffect(brainDeltas)) : undefined,
      meanPhysicalDelta: physicalDeltas.length ? roundedEffect(meanEffect(physicalDeltas)) : undefined,
      meanDurationMinutes: roundedEffect(meanEffect(rows.map((row) => row.durationMinutes))),
      positiveCount: rows.filter((row) => row.deltaScore >= 5).length,
      negativeCount: rows.filter((row) => row.deltaScore <= -5).length,
      neutralCount: rows.filter((row) => Math.abs(row.deltaScore) < 5).length,
      trend,
      evidence,
    };
  }).sort((left, right) => {
    if (left.sampleCount !== right.sampleCount) return right.sampleCount - left.sampleCount;
    return Math.abs(right.meanDelta) - Math.abs(left.meanDelta);
  });
}

/**
 * Build observational Energy effects from persisted TaskSession ↔ Energy references.
 * The linker has already chosen the before/after snapshots, so analytics never re-match
 * by Goal, timestamp proximity, raw Task fields, or Timer runtime history.
 */
export function buildEnergyEffects(items: RecordViewItem[], options: BuildEnergyEffectsOptions = {}): EnergyEffectAnalytics | null {
  const highBeforeGapMinutes = Math.max(1, options.highBeforeGapMinutes ?? DEFAULT_HIGH_BEFORE_GAP);
  const highAfterGapMinutes = Math.max(1, options.highAfterGapMinutes ?? DEFAULT_HIGH_AFTER_GAP);
  const minimumTrendSamples = Math.max(2, options.minimumTrendSamples ?? DEFAULT_MINIMUM_TREND_SAMPLES);
  const supportedTrendSamples = Math.max(minimumTrendSamples, options.supportedTrendSamples ?? DEFAULT_SUPPORTED_TREND_SAMPLES);

  const byId = new Map(items.map((item) => [item.id, item] as const));
  const pointById = new Map<string, TimedEnergyPoint>();
  for (const item of items) {
    const point = readEffectEnergyPoint(item);
    if (point) pointById.set(point.itemId, point);
  }

  const intervals = items
    .map((item) => resolveEffectActivityInterval(item, byId))
    .filter((interval): interval is ActivityInterval => !!interval)
    .sort((left, right) => left.startAbsolute - right.startAbsolute);
  if (intervals.length === 0) return null;

  const samples: EnergyActivityEffectSample[] = [];
  for (const record of items) {
    const session = asTaskSessionRecord(record);
    if (!session?.startEnergyRecordId || !session.endEnergyRecordId) continue;
    const interval = resolveEffectActivityInterval(record, byId);
    if (!interval) continue;
    const before = pointById.get(session.startEnergyRecordId);
    const after = pointById.get(session.endEnergyRecordId);
    if (!before || !after || before.itemId === after.itemId) continue;

    const beforeGapMinutes = Math.max(0, Math.round(interval.startAbsolute - before.absoluteMinute));
    const afterGapMinutes = Math.max(0, Math.round(after.absoluteMinute - interval.endAbsolute));
    const deltaScore = typeof session.energyDelta === 'number' ? session.energyDelta : after.score - before.score;
    const deltaBrain = typeof session.brainDelta === 'number'
      ? session.brainDelta
      : before.brainScore != null && after.brainScore != null ? after.brainScore - before.brainScore : undefined;
    const deltaPhysical = typeof session.physicalDelta === 'number'
      ? session.physicalDelta
      : before.physicalScore != null && after.physicalScore != null ? after.physicalScore - before.physicalScore : undefined;

    samples.push({
      activityItemId: session.id,
      activityTitle: activityTitle(interval.item),
      activityLabel: classifyEnergyActivity(interval.item),
      themeLabel: effectThemeLabel(interval.item),
      durationBucket: effectDurationBucket(interval.durationMinutes),
      durationMinutes: interval.durationMinutes,
      startDate: interval.startDate,
      startTime: interval.startTime,
      endDate: interval.endDate,
      endTime: interval.endTime,
      before,
      after,
      beforeGapMinutes,
      afterGapMinutes,
      deltaScore,
      deltaBrain,
      deltaPhysical,
      confidence: effectConfidence(beforeGapMinutes, afterGapMinutes, { highBeforeGapMinutes, highAfterGapMinutes }),
      item: interval.item,
    });
  }

  return {
    eligibleActivityCount: intervals.length,
    pairedActivityCount: samples.length,
    highConfidencePairCount: samples.filter((sample) => sample.confidence === 'high').length,
    mediumConfidencePairCount: samples.filter((sample) => sample.confidence === 'medium').length,
    excludedActivityCount: intervals.length - samples.length,
    samples,
    byActivity: aggregateEffectRows(samples, 'activity', (sample) => sample.activityLabel, minimumTrendSamples, supportedTrendSamples),
    byTheme: aggregateEffectRows(samples, 'theme', (sample) => sample.themeLabel, minimumTrendSamples, supportedTrendSamples),
    byDuration: aggregateEffectRows(samples, 'duration', (sample) => sample.durationBucket, minimumTrendSamples, supportedTrendSamples),
  };
}
