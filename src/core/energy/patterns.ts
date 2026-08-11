import type { Item } from '../types/schema';
import { isEnergyItem, readEnergyItemSnapshot } from './item';
import { asTaskSessionRecord } from '../records/task/taskSession';
import {
  mergePatternSessions,
  patternAbsoluteMinute,
  patternDateFromOrdinal,
  patternEvidence,
  patternFormatTime,
  patternMean,
  patternMedian,
  patternTimeMinutes,
  patternTrend,
  resolvePatternActivity,
} from './patternSupport';
import type {
  BuildEnergyPatternsOptions,
  EnergyContinuousWorkPattern,
  EnergyDaypartPattern,
  EnergyHighStateContinuationSample,
  EnergyLagPattern,
  EnergyPatternAnalytics,
  EnergyPatternPoint,
  EnergyPatternWorkSession,
  EnergyStopProxyPattern,
} from './patternTypes';

export type {
  BuildEnergyPatternsOptions,
  EnergyContinuousWorkPattern,
  EnergyDaypartPattern,
  EnergyHighStateContinuationSample,
  EnergyLagPattern,
  EnergyPatternAnalytics,
  EnergyPatternEvidence,
  EnergyPatternTrend,
  EnergyStopProxyPattern,
} from './patternTypes';

const DAYPARTS = [
  { key: 'night', label: '深夜 00–06', startHour: 0, endHour: 6 },
  { key: 'morning', label: '早晨 06–10', startHour: 6, endHour: 10 },
  { key: 'midday', label: '上午 10–14', startHour: 10, endHour: 14 },
  { key: 'afternoon', label: '下午 14–18', startHour: 14, endHour: 18 },
  { key: 'evening', label: '晚上 18–22', startHour: 18, endHour: 22 },
  { key: 'late', label: '夜间 22–24', startHour: 22, endHour: 24 },
] as const;

const LAG_WINDOWS = [
  { key: '6h' as const, label: '+6 小时', lagHours: 6, toleranceMinutes: 90 },
  { key: '12h' as const, label: '+12 小时', lagHours: 12, toleranceMinutes: 120 },
  { key: '24h' as const, label: '+24 小时', lagHours: 24, toleranceMinutes: 180 },
];

const SESSION_BUCKETS = [
  { key: 'lt30', label: '<30min', minMinutes: 0, maxMinutes: 29 },
  { key: '30-59', label: '30–59min', minMinutes: 30, maxMinutes: 59 },
  { key: '60-89', label: '60–89min', minMinutes: 60, maxMinutes: 89 },
  { key: '90-119', label: '90–119min', minMinutes: 90, maxMinutes: 119 },
  { key: 'ge120', label: '≥120min', minMinutes: 120 },
] as const;

type SessionBucket = typeof SESSION_BUCKETS[number];

interface PairedSession {
  session: EnergyPatternWorkSession;
  before: EnergyPatternPoint;
  after: EnergyPatternPoint;
  deltaScore: number;
  deltaBrain?: number;
  deltaPhysical?: number;
}

function readPoints(items: Item[]): EnergyPatternPoint[] {
  const points: EnergyPatternPoint[] = [];
  for (const item of items) {
    if (!isEnergyItem(item)) continue;
    const snapshot = readEnergyItemSnapshot(item);
    if (!snapshot?.date || !snapshot.time) continue;
    const absolute = patternAbsoluteMinute(snapshot.date, snapshot.time);
    const minuteOfDay = patternTimeMinutes(snapshot.time);
    if (absolute == null || minuteOfDay == null) continue;
    points.push({ itemId: item.id, date: snapshot.date, time: snapshot.time, absoluteMinute: absolute, minuteOfDay, score: snapshot.score, brainScore: snapshot.brainScore, physicalScore: snapshot.physicalScore, item });
  }
  return points.sort((a, b) => a.absoluteMinute - b.absoluteMinute);
}

function buildDayparts(points: EnergyPatternPoint[]): EnergyDaypartPattern[] {
  return DAYPARTS.map((bucket) => {
    const selected = points.filter((point) => point.minuteOfDay >= bucket.startHour * 60 && point.minuteOfDay < bucket.endHour * 60);
    const brain = selected.flatMap((point) => point.brainScore == null ? [] : [point.brainScore]);
    const physical = selected.flatMap((point) => point.physicalScore == null ? [] : [point.physicalScore]);
    return {
      ...bucket,
      sampleCount: selected.length,
      meanScore: patternMean(selected.map((point) => point.score)),
      medianScore: patternMedian(selected.map((point) => point.score)),
      meanBrainScore: patternMean(brain),
      meanPhysicalScore: patternMean(physical),
      evidence: patternEvidence(selected.length),
    };
  });
}

function nearestPoint(points: EnergyPatternPoint[], desired: number, tolerance: number, after: number): EnergyPatternPoint | undefined {
  let best: EnergyPatternPoint | undefined;
  let bestGap = Number.POSITIVE_INFINITY;
  for (const point of points) {
    if (point.absoluteMinute <= after) continue;
    const gap = Math.abs(point.absoluteMinute - desired);
    if (gap <= tolerance && gap < bestGap) {
      best = point;
      bestGap = gap;
    }
  }
  return best;
}

function buildLag(points: EnergyPatternPoint[], windowStart: number): EnergyLagPattern[] {
  return LAG_WINDOWS.map((window) => {
    const deltas: number[] = [];
    const brain: number[] = [];
    const physical: number[] = [];
    for (const baseline of points) {
      if (baseline.absoluteMinute < windowStart) continue;
      const target = nearestPoint(points, baseline.absoluteMinute + window.lagHours * 60, window.toleranceMinutes, baseline.absoluteMinute);
      if (!target) continue;
      deltas.push(target.score - baseline.score);
      if (baseline.brainScore != null && target.brainScore != null) brain.push(target.brainScore - baseline.brainScore);
      if (baseline.physicalScore != null && target.physicalScore != null) physical.push(target.physicalScore - baseline.physicalScore);
    }
    return {
      ...window,
      sampleCount: deltas.length,
      meanDelta: patternMean(deltas),
      medianDelta: patternMedian(deltas),
      meanBrainDelta: patternMean(brain),
      meanPhysicalDelta: patternMean(physical),
      trend: patternTrend(deltas),
      evidence: patternEvidence(deltas.length),
    };
  });
}

function pairSession(session: EnergyPatternWorkSession, pointById: Map<string, EnergyPatternPoint>): PairedSession | null {
  const first = asTaskSessionRecord(session.items[0]);
  const last = asTaskSessionRecord(session.items[session.items.length - 1]);
  if (!first?.startEnergyRecordId || !last?.endEnergyRecordId) return null;
  const before = pointById.get(first.startEnergyRecordId);
  const after = pointById.get(last.endEnergyRecordId);
  if (!before || !after || before.itemId === after.itemId) return null;
  return {
    session,
    before,
    after,
    deltaScore: after.score - before.score,
    deltaBrain: before.brainScore != null && after.brainScore != null ? after.brainScore - before.brainScore : undefined,
    deltaPhysical: before.physicalScore != null && after.physicalScore != null ? after.physicalScore - before.physicalScore : undefined,
  };
}

function inBucket(session: EnergyPatternWorkSession, bucket: SessionBucket): boolean {
  return session.durationMinutes >= bucket.minMinutes && (!('maxMinutes' in bucket) || session.durationMinutes <= bucket.maxMinutes);
}

function buildContinuousWork(sessions: EnergyPatternWorkSession[], pairs: PairedSession[]): EnergyContinuousWorkPattern[] {
  return SESSION_BUCKETS.map((bucket) => {
    const bucketSessions = sessions.filter((session) => inBucket(session, bucket));
    const bucketPairs = pairs.filter((pair) => inBucket(pair.session, bucket));
    const deltas = bucketPairs.map((pair) => pair.deltaScore);
    return {
      ...bucket,
      sessionCount: bucketSessions.length,
      pairedSessionCount: bucketPairs.length,
      meanDelta: patternMean(deltas),
      medianDelta: patternMedian(deltas),
      meanBrainDelta: patternMean(bucketPairs.flatMap((pair) => pair.deltaBrain == null ? [] : [pair.deltaBrain])),
      meanPhysicalDelta: patternMean(bucketPairs.flatMap((pair) => pair.deltaPhysical == null ? [] : [pair.deltaPhysical])),
      trend: patternTrend(deltas),
      evidence: patternEvidence(bucketPairs.length),
    };
  });
}

function buildStopProxy(
  points: EnergyPatternPoint[],
  sessions: EnergyPatternWorkSession[],
  windowStart: number,
  threshold: number,
  workStartWindow: number,
  longMinutes: number,
  lateNightHour: number,
): EnergyStopProxyPattern {
  const highPoints = points.filter((point) => point.absoluteMinute >= windowStart && point.score >= threshold);
  const samples: EnergyHighStateContinuationSample[] = [];
  for (const point of highPoints) {
    const session = sessions.find((candidate) => candidate.endAbsolute > point.absoluteMinute && (candidate.startAbsolute <= point.absoluteMinute || candidate.startAbsolute - point.absoluteMinute <= workStartWindow));
    if (!session) continue;
    const stopLatencyMinutes = Math.max(0, Math.round(session.endAbsolute - point.absoluteMinute));
    const crossesMidnight = Math.floor(session.endAbsolute / 1440) > Math.floor(session.startAbsolute / 1440);
    const endMinuteOfDay = ((session.endAbsolute % 1440) + 1440) % 1440;
    samples.push({
      energyItemId: point.itemId,
      date: point.date,
      time: point.time,
      score: point.score,
      sessionDurationMinutes: Math.round(session.durationMinutes),
      stopLatencyMinutes,
      sessionStartTime: patternFormatTime(session.startAbsolute),
      sessionEndTime: patternFormatTime(session.endAbsolute),
      crossesMidnight,
      lateNight: crossesMidnight || endMinuteOfDay >= lateNightHour * 60,
    });
  }
  const longCount = samples.filter((sample) => sample.stopLatencyMinutes >= longMinutes).length;
  const lateCount = samples.filter((sample) => sample.lateNight).length;
  return {
    highEnergySampleCount: highPoints.length,
    followedByWorkCount: samples.length,
    longContinuationCount: longCount,
    lateNightCount: lateCount,
    meanSessionDurationMinutes: patternMean(samples.map((sample) => sample.sessionDurationMinutes)),
    meanStopLatencyMinutes: patternMean(samples.map((sample) => sample.stopLatencyMinutes)),
    longContinuationRatio: samples.length ? longCount / samples.length : undefined,
    lateNightRatio: samples.length ? lateCount / samples.length : undefined,
    evidence: patternEvidence(samples.length),
    recentSamples: [...samples].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)).slice(0, 5),
  };
}

export function buildEnergyPatterns(items: Item[], options: BuildEnergyPatternsOptions = {}): EnergyPatternAnalytics | null {
  const points = readPoints(items);
  const activityRecords = options.activityRecords || items;
  if (!points.length) return null;
  const analysisWindowDays = Math.max(7, Math.min(90, Math.floor(options.analysisWindowDays ?? 30)));
  const sessionGapMinutes = Math.max(0, Math.min(60, Math.floor(options.sessionGapMinutes ?? 15)));
  const highThreshold = Math.max(60, Math.min(100, Math.floor(options.highEnergyThreshold ?? 80)));
  const workStartWindow = Math.max(0, Math.min(180, Math.floor(options.highEnergyWorkStartWindowMinutes ?? 60)));
  const longMinutes = Math.max(30, Math.min(360, Math.floor(options.longContinuationMinutes ?? 120)));
  const lateNightHour = Math.max(20, Math.min(23, Math.floor(options.lateNightHour ?? 23)));
  const endOrdinal = Math.floor(points[points.length - 1].absoluteMinute / 1440);
  const startOrdinal = endOrdinal - analysisWindowDays + 1;
  const windowStart = startOrdinal * 1440;
  const visiblePoints = points.filter((point) => point.absoluteMinute >= windowStart);
  const intervals = activityRecords.map(resolvePatternActivity).filter((value): value is NonNullable<typeof value> => !!value).filter((interval) => interval.endAbsolute >= windowStart);
  const sessions = mergePatternSessions(intervals, sessionGapMinutes);
  const evidencePoints = readPoints(activityRecords);
  const pointById = new Map([...points, ...evidencePoints].map((point) => [point.itemId, point] as const));
  const pairs = sessions.map((session) => pairSession(session, pointById)).filter((value): value is PairedSession => !!value);
  return {
    analysisWindowDays,
    startDate: patternDateFromOrdinal(startOrdinal),
    endDate: patternDateFromOrdinal(endOrdinal),
    energySampleCount: visiblePoints.length,
    dayparts: buildDayparts(visiblePoints),
    lag: buildLag(points, windowStart),
    continuousWork: buildContinuousWork(sessions, pairs),
    continuousSessionCount: sessions.length,
    pairedContinuousSessionCount: pairs.length,
    stopProxy: buildStopProxy(points, sessions, windowStart, highThreshold, workStartWindow, longMinutes, lateNightHour),
  };
}
