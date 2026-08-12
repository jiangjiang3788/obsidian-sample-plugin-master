import type { CurrentView } from '../types/common';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import { isEnergyItem, readEnergyItemSnapshot } from './item';
import type { EnergyCaptureMode, EnergyScoreMode } from './types';

export type EnergyPeriodMode = 'day-horizontal' | 'date-time' | 'daily-dots';

export interface EnergyPeriodSample {
  itemId: string;
  date: string;
  time: string;
  minuteOfDay: number;
  score: number;
  brainScore?: number;
  physicalScore?: number;
  scoreMode?: EnergyScoreMode;
  captureMode: EnergyCaptureMode;
  item: RecordViewItem;
}

export interface EnergyPeriodDay {
  date: string;
  sampled: boolean;
  samples: EnergyPeriodSample[];
  dailyScore?: number;
  dailyBrainScore?: number;
  dailyPhysicalScore?: number;
}

export interface EnergyPeriodModel {
  currentView: CurrentView;
  mode: EnergyPeriodMode;
  startDate: string;
  endDate: string;
  days: EnergyPeriodDay[];
  sampledDays: number;
  missingDays: number;
  totalSamples: number;
}

export interface BuildEnergyPeriodOptions {
  currentView: CurrentView;
  startDate: string;
  endDate: string;
}

function dateOrdinal(value: string): number | undefined {
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

function dateFromOrdinal(value: number): string {
  return new Date(value * 86_400_000).toISOString().slice(0, 10);
}

function timeMinutes(value: string): number | undefined {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
  return hour * 60 + minute;
}

function captureMode(value: unknown): EnergyCaptureMode {
  return String(value || '').trim() === 'retrospective' ? 'retrospective' : 'realtime';
}

function roundMean(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function readSample(item: RecordViewItem): EnergyPeriodSample | null {
  if (!isEnergyItem(item)) return null;
  const snapshot = readEnergyItemSnapshot(item);
  if (!snapshot?.date || !snapshot.time) return null;
  const ordinal = dateOrdinal(snapshot.date);
  const minuteOfDay = timeMinutes(snapshot.time);
  if (ordinal == null || minuteOfDay == null) return null;
  return {
    itemId: item.id,
    date: snapshot.date,
    time: snapshot.time,
    minuteOfDay,
    score: snapshot.score,
    brainScore: snapshot.brainScore,
    physicalScore: snapshot.physicalScore,
    scoreMode: snapshot.scoreMode,
    captureMode: captureMode(snapshot.captureMode),
    item,
  };
}

function periodMode(currentView: CurrentView): EnergyPeriodMode {
  if (currentView === '天') return 'day-horizontal';
  if (currentView === '周' || currentView === '月') return 'date-time';
  return 'daily-dots';
}

/**
 * Build the visual Energy period projection used by EnergyView.
 * It never interpolates. Quarter/year intentionally collapse each calendar day to one equal-weight daily point.
 */
export function buildEnergyPeriod(items: RecordViewItem[], options: BuildEnergyPeriodOptions): EnergyPeriodModel | null {
  const startOrdinal = dateOrdinal(options.startDate);
  const endOrdinal = dateOrdinal(options.endDate);
  if (startOrdinal == null || endOrdinal == null || endOrdinal < startOrdinal) return null;

  const samples = items
    .map(readSample)
    .filter((sample): sample is EnergyPeriodSample => !!sample)
    .filter((sample) => {
      const ordinal = dateOrdinal(sample.date);
      return ordinal != null && ordinal >= startOrdinal && ordinal <= endOrdinal;
    })
    .sort((left, right) => left.date.localeCompare(right.date) || left.minuteOfDay - right.minuteOfDay);

  const byDate = new Map<string, EnergyPeriodSample[]>();
  for (const sample of samples) {
    const rows = byDate.get(sample.date) || [];
    rows.push(sample);
    byDate.set(sample.date, rows);
  }

  const days: EnergyPeriodDay[] = [];
  for (let ordinal = startOrdinal; ordinal <= endOrdinal; ordinal += 1) {
    const date = dateFromOrdinal(ordinal);
    const daySamples = byDate.get(date) || [];
    days.push({
      date,
      sampled: daySamples.length > 0,
      samples: daySamples,
      dailyScore: roundMean(daySamples.map((row) => row.score)),
      dailyBrainScore: roundMean(daySamples.map((row) => row.brainScore).filter((value): value is number => value != null)),
      dailyPhysicalScore: roundMean(daySamples.map((row) => row.physicalScore).filter((value): value is number => value != null)),
    });
  }

  const sampledDays = days.filter((day) => day.sampled).length;
  return {
    currentView: options.currentView,
    mode: periodMode(options.currentView),
    startDate: options.startDate,
    endDate: options.endDate,
    days,
    sampledDays,
    missingDays: days.length - sampledDays,
    totalSamples: samples.length,
  };
}
