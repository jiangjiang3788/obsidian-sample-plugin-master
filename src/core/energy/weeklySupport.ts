import type { Item } from '../types/schema';
import { readEnergyItemSnapshot, type EnergyItemSnapshot } from './item';
import { asTaskSessionRecord } from '../records/task/taskSession';

export function energyDateOrdinal(value: string): number | undefined {
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

export function energyDateFromOrdinal(ordinal: number): string {
  return new Date(ordinal * 86_400_000).toISOString().slice(0, 10);
}

export function energyItemOccurrenceDate(item: Item): string | undefined {
  const energy = readEnergyItemSnapshot(item);
  if (energy?.date) return energy.date;
  const session = asTaskSessionRecord(item);
  if (session?.sessionStartedAt) return session.sessionStartedAt.slice(0, 10);
  const candidates = [
    item.date,
    item.doneDate,
    item.startDate,
    item.scheduledDate,
    item.dueDate,
    item.createdDate,
    item.extra?.['日期'],
  ];
  for (const value of candidates) {
    const text = String(value ?? '').trim();
    if (energyDateOrdinal(text) != null) return text;
  }
  return undefined;
}

export function filterItemsByDateWindow(items: Item[], startDate: string, endDate: string): Item[] {
  const start = energyDateOrdinal(startDate);
  const end = energyDateOrdinal(endDate);
  if (start == null || end == null) return [];
  return items.filter((item) => {
    const date = energyItemOccurrenceDate(item);
    const ordinal = date ? energyDateOrdinal(date) : undefined;
    return ordinal != null && ordinal >= start && ordinal <= end;
  });
}

export function roundEnergyMean(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export function energyMedian(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const raw = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return Math.round(raw * 10) / 10;
}


export function energyDayBalancedMeans(snapshots: EnergyItemSnapshot[], field: 'score' | 'brainScore' | 'physicalScore'): number[] {
  const byDate = new Map<string, number[]>();
  for (const snapshot of snapshots) {
    if (!snapshot.date) continue;
    const value = snapshot[field];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const values = byDate.get(snapshot.date) || [];
    values.push(value);
    byDate.set(snapshot.date, values);
  }
  return [...byDate.values()].map((values) => roundEnergyMean(values)).filter((value): value is number => value != null);
}
