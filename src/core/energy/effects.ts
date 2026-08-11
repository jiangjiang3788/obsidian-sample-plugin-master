import type { Item } from '../types/schema';
import { isEnergyItem, readEnergyItemSnapshot } from './item';

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
  item: Item;
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
  item: Item;
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
  /** Default true for legacy per-goal analysis. Global recommendation learning sets false. */
  requireSharedGoal?: boolean;
}

interface TimedEnergyPoint extends EnergyEffectEndpoint {
  absoluteMinute: number;
}

interface ActivityInterval {
  item: Item;
  startAbsolute: number;
  endAbsolute: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  durationMinutes: number;
}

const DEFAULT_MAX_BEFORE_GAP = 120;
const DEFAULT_MAX_AFTER_GAP = 90;
const DEFAULT_HIGH_BEFORE_GAP = 60;
const DEFAULT_HIGH_AFTER_GAP = 30;
const DEFAULT_MINIMUM_TREND_SAMPLES = 3;
const DEFAULT_SUPPORTED_TREND_SAMPLES = 5;

function readEffectText(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text || undefined;
}

function readEffectNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = readEffectText(value);
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function effectDateOrdinal(value: string): number | undefined {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const stamp = Date.UTC(year, month - 1, day);
  const date = new Date(stamp);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return Math.floor(stamp / 86_400_000);
}

function effectDateFromOrdinal(ordinal: number): string {
  return new Date(ordinal * 86_400_000).toISOString().slice(0, 10);
}

function parseEffectTimeMinutes(value: unknown): number | undefined {
  const match = readEffectText(value)?.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
  return hour * 60 + minute;
}

function formatEffectTimeMinutes(value: number): string {
  const normalized = ((Math.round(value) % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function effectAbsoluteMinute(date: string, time: string): number | undefined {
  const ordinal = effectDateOrdinal(date);
  const minute = parseEffectTimeMinutes(time);
  if (ordinal == null || minute == null) return undefined;
  return ordinal * 1440 + minute;
}


function normalizeEffectGoalPath(value: unknown): string {
  return String(value ?? '').trim().replace(/^#/, '');
}

function effectGoalIds(item: Item): string[] {
  return [item.goalId, ...(item.goalIds || [])].map((value) => String(value || '').trim()).filter(Boolean);
}

function effectGoalPaths(item: Item): string[] {
  return [item.goalPath, ...(item.goalPaths || [])].map(normalizeEffectGoalPath).filter(Boolean);
}

function effectsShareGoal(left: Item, right: Item): boolean {
  const leftIds = effectGoalIds(left);
  const rightIds = effectGoalIds(right);
  if (leftIds.length > 0 || rightIds.length > 0) return leftIds.some((id) => rightIds.includes(id));
  const leftPaths = effectGoalPaths(left);
  const rightPaths = effectGoalPaths(right);
  if (leftPaths.length > 0 || rightPaths.length > 0) return leftPaths.some((path) => rightPaths.includes(path));
  return true;
}

function effectOccurrenceDate(item: Item): string | undefined {
  return readEffectText(item.date)
    || readEffectText(item.doneDate)
    || readEffectText(item.startDate)
    || readEffectText(item.scheduledDate)
    || readEffectText(item.dueDate)
    || readEffectText(item.createdDate)
    || readEffectText(item.extra?.['日期']);
}

function effectCoreBlock(item: Item): string {
  return String(item.coreBlock || item.extra?.['核心Block'] || item.categoryKey || '')
    .replace(/^core\./i, '')
    .split('/')[0]
    .trim()
    .toLowerCase();
}

function isEffectTask(item: Item): boolean {
  if (isEnergyItem(item)) return false;
  const block = effectCoreBlock(item);
  return block === 'task' || item.type === 'task' || /任务/.test(String(item.categoryKey || ''));
}

function resolveEffectActivityInterval(item: Item): ActivityInterval | null {
  if (!isEffectTask(item)) return null;
  const date = effectOccurrenceDate(item);
  if (!date) return null;
  const ordinal = effectDateOrdinal(date);
  if (ordinal == null) return null;

  const durationValue = readEffectNumber(item.duration ?? item.extra?.['时长']);
  const duration = durationValue != null && durationValue >= 0 ? durationValue : undefined;
  let startMinute = parseEffectTimeMinutes(item.startTime ?? item.extra?.['时间'] ?? item.extra?.['开始']);
  let endMinute = parseEffectTimeMinutes(item.endTime ?? item.extra?.['结束']);
  if (startMinute == null && endMinute != null && duration != null) startMinute = endMinute - duration;
  if (endMinute == null && startMinute != null && duration != null) endMinute = startMinute + duration;
  if (startMinute == null || endMinute == null) return null;

  let startAbsolute = ordinal * 1440 + startMinute;
  let endAbsolute = ordinal * 1440 + endMinute;
  if (endAbsolute < startAbsolute) endAbsolute += 1440;
  if (duration != null && Math.abs((endAbsolute - startAbsolute) - duration) > 1) endAbsolute = startAbsolute + duration;
  if (endAbsolute <= startAbsolute) return null;

  return {
    item,
    startAbsolute,
    endAbsolute,
    startDate: effectDateFromOrdinal(Math.floor(startAbsolute / 1440)),
    startTime: formatEffectTimeMinutes(startAbsolute),
    endDate: effectDateFromOrdinal(Math.floor(endAbsolute / 1440)),
    endTime: formatEffectTimeMinutes(endAbsolute),
    durationMinutes: Math.max(1, Math.round(endAbsolute - startAbsolute)),
  };
}

function readEffectEnergyPoint(item: Item): TimedEnergyPoint | null {
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

function activityTitle(item: Item): string {
  return readEffectText(item.title) || readEffectText(item.content) || '未命名任务';
}

export function classifyEnergyActivity(item: Item): string {
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

function effectThemeLabel(item: Item): string {
  return readEffectText(item.themePath) || readEffectText(item.theme) || readEffectText(item.rootTheme) || readEffectText(item.leafTheme) || '未标主题';
}

function effectDurationBucket(durationMinutes: number): string {
  if (durationMinutes < 30) return '<30min';
  if (durationMinutes < 60) return '30–59min';
  if (durationMinutes < 90) return '60–89min';
  if (durationMinutes < 120) return '90–119min';
  return '≥120min';
}

function nearestEffectBefore(points: TimedEnergyPoint[], absolute: number, maxGap: number): TimedEnergyPoint | undefined {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];
    if (point.absoluteMinute > absolute) continue;
    if (absolute - point.absoluteMinute > maxGap) return undefined;
    return point;
  }
  return undefined;
}

function nearestEffectAfter(points: TimedEnergyPoint[], absolute: number, maxGap: number): TimedEnergyPoint | undefined {
  for (const point of points) {
    if (point.absoluteMinute < absolute) continue;
    if (point.absoluteMinute - absolute > maxGap) return undefined;
    return point;
  }
  return undefined;
}

function hasCompetingActivity(intervals: ActivityInterval[], target: ActivityInterval, before: TimedEnergyPoint, after: TimedEnergyPoint, requireSharedGoal: boolean): boolean {
  return intervals.some((candidate) => {
    if (candidate.item.id === target.item.id) return false;
    if (requireSharedGoal && !effectsShareGoal(target.item, candidate.item)) return false;
    if (candidate.endAbsolute <= before.absoluteMinute || candidate.startAbsolute >= after.absoluteMinute) return false;
    const overlapStart = Math.max(candidate.startAbsolute, before.absoluteMinute);
    const overlapEnd = Math.min(candidate.endAbsolute, after.absoluteMinute);
    return overlapEnd - overlapStart >= 10;
  });
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
 * Pair exact Energy observations around completed task intervals and aggregate candidate effects.
 * This is observational association only. Ambiguous intervals with another >=10 minute task between
 * the before/after observations are excluded rather than force-attributed to one activity.
 */
export function buildEnergyEffects(items: Item[], options: BuildEnergyEffectsOptions = {}): EnergyEffectAnalytics | null {
  const maxBeforeGapMinutes = Math.max(1, options.maxBeforeGapMinutes ?? DEFAULT_MAX_BEFORE_GAP);
  const maxAfterGapMinutes = Math.max(1, options.maxAfterGapMinutes ?? DEFAULT_MAX_AFTER_GAP);
  const highBeforeGapMinutes = Math.max(1, options.highBeforeGapMinutes ?? DEFAULT_HIGH_BEFORE_GAP);
  const highAfterGapMinutes = Math.max(1, options.highAfterGapMinutes ?? DEFAULT_HIGH_AFTER_GAP);
  const minimumTrendSamples = Math.max(2, options.minimumTrendSamples ?? DEFAULT_MINIMUM_TREND_SAMPLES);
  const supportedTrendSamples = Math.max(minimumTrendSamples, options.supportedTrendSamples ?? DEFAULT_SUPPORTED_TREND_SAMPLES);
  const requireSharedGoal = options.requireSharedGoal !== false;

  const points = items.map(readEffectEnergyPoint).filter((point): point is TimedEnergyPoint => !!point)
    .sort((left, right) => left.absoluteMinute - right.absoluteMinute);
  const intervals = items.map(resolveEffectActivityInterval).filter((interval): interval is ActivityInterval => !!interval)
    .sort((left, right) => left.startAbsolute - right.startAbsolute);
  if (points.length < 2 || intervals.length === 0) return null;

  const samples: EnergyActivityEffectSample[] = [];
  for (const interval of intervals) {
    const goalPoints = requireSharedGoal ? points.filter((point) => effectsShareGoal(interval.item, point.item)) : points;
    const before = nearestEffectBefore(goalPoints, interval.startAbsolute, maxBeforeGapMinutes);
    const after = nearestEffectAfter(goalPoints, interval.endAbsolute, maxAfterGapMinutes);
    if (!before || !after || before.itemId === after.itemId) continue;
    if (hasCompetingActivity(intervals, interval, before, after, requireSharedGoal)) continue;
    const beforeGapMinutes = Math.round(interval.startAbsolute - before.absoluteMinute);
    const afterGapMinutes = Math.round(after.absoluteMinute - interval.endAbsolute);
    samples.push({
      activityItemId: interval.item.id,
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
      deltaScore: after.score - before.score,
      deltaBrain: before.brainScore != null && after.brainScore != null ? after.brainScore - before.brainScore : undefined,
      deltaPhysical: before.physicalScore != null && after.physicalScore != null ? after.physicalScore - before.physicalScore : undefined,
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
