import type { Item } from '../types/schema';
import type { EnergyPatternActivityInterval, EnergyPatternEvidence, EnergyPatternTrend, EnergyPatternWorkSession } from './patternTypes';

export function patternText(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text || undefined;
}

function patternNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = patternText(value);
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function patternDateOrdinal(value: string): number | undefined {
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

export function patternDateFromOrdinal(ordinal: number): string {
  return new Date(ordinal * 86_400_000).toISOString().slice(0, 10);
}

export function patternTimeMinutes(value: unknown): number | undefined {
  const match = patternText(value)?.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
  return hour * 60 + minute;
}

export function patternFormatTime(absoluteMinute: number): string {
  const minuteOfDay = ((Math.round(absoluteMinute) % 1440) + 1440) % 1440;
  return `${String(Math.floor(minuteOfDay / 60)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`;
}

export function patternAbsoluteMinute(date: string, time: string): number | undefined {
  const ordinal = patternDateOrdinal(date);
  const minute = patternTimeMinutes(time);
  return ordinal == null || minute == null ? undefined : ordinal * 1440 + minute;
}

function isTaskLike(item: Item): boolean {
  const core = patternText(item.coreBlock)?.replace(/^core\./, '');
  const category = patternText(item.categoryKey);
  return core === 'task' || item.type === 'task' || category === '任务' || category === 'task';
}

export function resolvePatternActivity(item: Item): EnergyPatternActivityInterval | null {
  if (!isTaskLike(item)) return null;
  const date = patternText(item.date ?? item.startDate ?? item.doneDate ?? item.scheduledDate ?? item.extra?.['日期']);
  if (!date) return null;
  const ordinal = patternDateOrdinal(date);
  if (ordinal == null) return null;
  const duration = patternNumber(item.duration ?? item.extra?.['时长']);
  const safeDuration = duration != null && duration >= 0 ? duration : undefined;
  let start = patternTimeMinutes(item.startTime ?? item.extra?.['时间'] ?? item.extra?.['开始']);
  let end = patternTimeMinutes(item.endTime ?? item.extra?.['结束']);
  if (start == null && end == null) return null;
  if (start == null && end != null && safeDuration != null) start = end - safeDuration;
  if (end == null && start != null && safeDuration != null) end = start + safeDuration;
  if (start == null || end == null) return null;
  const startAbsolute = ordinal * 1440 + start;
  let endAbsolute = ordinal * 1440 + end;
  if (endAbsolute < startAbsolute) endAbsolute += 1440;
  if (safeDuration != null && Math.abs((endAbsolute - startAbsolute) - safeDuration) > 1) endAbsolute = startAbsolute + safeDuration;
  if (endAbsolute <= startAbsolute) return null;
  return { item, startAbsolute, endAbsolute, durationMinutes: Math.round(endAbsolute - startAbsolute) };
}

export function patternEvidence(count: number): EnergyPatternEvidence {
  if (count >= 5) return 'supported';
  if (count >= 3) return 'exploratory';
  return 'insufficient';
}

export function patternMean(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export function patternMedian(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const raw = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return Math.round(raw * 10) / 10;
}

export function patternTrend(values: number[]): EnergyPatternTrend {
  if (values.length < 3) return 'insufficient';
  const avg = patternMean(values) ?? 0;
  const med = patternMedian(values) ?? 0;
  if (avg >= 5 && med >= 3) return 'up';
  if (avg <= -5 && med <= -3) return 'down';
  if (Math.abs(avg) < 5 && Math.abs(med) < 5) return 'stable';
  return 'mixed';
}

export function mergePatternSessions(intervals: EnergyPatternActivityInterval[], gapMinutes: number): EnergyPatternWorkSession[] {
  const sessions: EnergyPatternWorkSession[] = [];
  for (const interval of [...intervals].sort((a, b) => a.startAbsolute - b.startAbsolute)) {
    const current = sessions[sessions.length - 1];
    if (!current || interval.startAbsolute > current.endAbsolute + gapMinutes) {
      sessions.push({ startAbsolute: interval.startAbsolute, endAbsolute: interval.endAbsolute, durationMinutes: interval.durationMinutes, items: [interval.item] });
      continue;
    }
    current.endAbsolute = Math.max(current.endAbsolute, interval.endAbsolute);
    current.durationMinutes = Math.round(current.endAbsolute - current.startAbsolute);
    current.items.push(interval.item);
  }
  return sessions;
}
