import type { Item } from '../types/schema';
import { isEnergyItem, readEnergyItemSnapshot } from './item';
import type { EnergyCaptureMode, EnergyQuickLevel, EnergyScoreMode } from './types';

export interface EnergyTimelinePoint {
  itemId: string;
  date: string;
  time: string;
  minuteOfDay: number;
  score: number;
  quickLevel: EnergyQuickLevel;
  brainScore?: number;
  physicalScore?: number;
  scoreMode?: EnergyScoreMode;
  captureMode: EnergyCaptureMode;
  recordedAt?: string;
  source?: string;
  item: Item;
}

export interface EnergyTimelineDay {
  date: string;
  sampled: boolean;
  points: EnergyTimelinePoint[];
}

export interface EnergyTimelineCoverage {
  windowDays: number;
  startDate: string;
  endDate: string;
  sampledDays: number;
  missingDays: number;
  coverageRatio: number;
  totalSamples: number;
  realtimeSamples: number;
  retrospectiveSamples: number;
  detailedSamples: number;
}

export interface EnergyTimelineModel {
  days: EnergyTimelineDay[];
  coverage: EnergyTimelineCoverage;
}

export interface BuildEnergyTimelineOptions {
  windowDays?: number;
  endDate?: string;
}

function parseDateOrdinal(value: string): number | undefined {
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

function dateFromOrdinal(ordinal: number): string {
  return new Date(ordinal * 86_400_000).toISOString().slice(0, 10);
}

function parseTimeMinutes(value: string): number | undefined {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
  return hour * 60 + minute;
}

function normalizeCaptureMode(value: unknown): EnergyCaptureMode {
  return String(value || '').trim() === 'retrospective' ? 'retrospective' : 'realtime';
}

function readTimelinePoint(item: Item): EnergyTimelinePoint | null {
  if (!isEnergyItem(item)) return null;
  const snapshot = readEnergyItemSnapshot(item);
  if (!snapshot?.date || !snapshot.time) return null;
  const ordinal = parseDateOrdinal(snapshot.date);
  const minuteOfDay = parseTimeMinutes(snapshot.time);
  if (ordinal == null || minuteOfDay == null) return null;
  return {
    itemId: item.id,
    date: snapshot.date,
    time: snapshot.time,
    minuteOfDay,
    score: snapshot.score,
    quickLevel: snapshot.quickLevel,
    brainScore: snapshot.brainScore,
    physicalScore: snapshot.physicalScore,
    scoreMode: snapshot.scoreMode,
    captureMode: normalizeCaptureMode(snapshot.captureMode),
    recordedAt: snapshot.recordedAt,
    source: snapshot.source,
    item,
  };
}

/**
 * Build a sparse Energy timeline. Missing days remain explicit empty rows; no score interpolation is performed.
 * The default window ends at the latest valid Energy sample, which keeps historical datasets meaningful.
 */
export function buildEnergyTimeline(items: Item[], options: BuildEnergyTimelineOptions = {}): EnergyTimelineModel | null {
  const points = items.map(readTimelinePoint).filter((point): point is EnergyTimelinePoint => !!point);
  if (points.length === 0) return null;

  const sorted = [...points].sort((left, right) => {
    const dateCompare = left.date.localeCompare(right.date);
    if (dateCompare !== 0) return dateCompare;
    return left.minuteOfDay - right.minuteOfDay;
  });

  const configuredEnd = options.endDate && parseDateOrdinal(options.endDate) != null ? options.endDate : undefined;
  const endDate = configuredEnd || sorted[sorted.length - 1].date;
  const endOrdinal = parseDateOrdinal(endDate);
  if (endOrdinal == null) return null;
  const windowDays = Math.max(1, Math.min(31, Math.floor(options.windowDays ?? 7)));
  const startOrdinal = endOrdinal - windowDays + 1;
  const startDate = dateFromOrdinal(startOrdinal);

  const pointsByDate = new Map<string, EnergyTimelinePoint[]>();
  for (const point of sorted) {
    const ordinal = parseDateOrdinal(point.date);
    if (ordinal == null || ordinal < startOrdinal || ordinal > endOrdinal) continue;
    const list = pointsByDate.get(point.date) || [];
    list.push(point);
    pointsByDate.set(point.date, list);
  }

  const days: EnergyTimelineDay[] = [];
  for (let ordinal = startOrdinal; ordinal <= endOrdinal; ordinal += 1) {
    const date = dateFromOrdinal(ordinal);
    const dayPoints = pointsByDate.get(date) || [];
    days.push({ date, sampled: dayPoints.length > 0, points: dayPoints });
  }

  const visiblePoints = days.flatMap((day) => day.points);
  const sampledDays = days.filter((day) => day.sampled).length;
  const retrospectiveSamples = visiblePoints.filter((point) => point.captureMode === 'retrospective').length;
  const detailedSamples = visiblePoints.filter((point) => point.scoreMode === 'detailed').length;

  return {
    days,
    coverage: {
      windowDays,
      startDate,
      endDate,
      sampledDays,
      missingDays: windowDays - sampledDays,
      coverageRatio: sampledDays / windowDays,
      totalSamples: visiblePoints.length,
      realtimeSamples: visiblePoints.length - retrospectiveSamples,
      retrospectiveSamples,
      detailedSamples,
    },
  };
}
