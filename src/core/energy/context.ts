import type { Item } from '../types/schema';
import { isEnergyItem, readEnergyItemSnapshot } from './item';

export type EnergyContextConfidence = 'high' | 'medium' | 'low';
export type EnergyActivityRelation = 'active' | 'recent';
export type EnergyDailySignalKind = 'sleep' | 'body' | 'exercise';

export interface EnergyActivityContext {
  itemId: string;
  title: string;
  relation: EnergyActivityRelation;
  confidence: EnergyContextConfidence;
  gapMinutes: number;
  durationMinutes?: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  item: Item;
}

export interface EnergyDailySignalContext {
  itemId: string;
  kind: EnergyDailySignalKind;
  label: string;
  value?: string | number;
  item: Item;
}

export interface EnergyContext {
  primaryActivity?: EnergyActivityContext;
  nearbyActivities: EnergyActivityContext[];
  dailySignals: EnergyDailySignalContext[];
}

export interface ResolveEnergyContextOptions {
  recentWindowMinutes?: number;
  reliableWindowMinutes?: number;
  maxNearbyActivities?: number;
}

const DEFAULT_RECENT_WINDOW_MINUTES = 120;
const DEFAULT_RELIABLE_WINDOW_MINUTES = 60;
const DEFAULT_MAX_NEARBY_ACTIVITIES = 3;

function readText(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text || undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = readText(value);
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeCoreBlock(item: Item): string {
  return String(item.coreBlock || item.extra?.['核心Block'] || item.categoryKey || '')
    .replace(/^core\./i, '')
    .split('/')[0]
    .trim()
    .toLowerCase();
}

function isTaskLike(item: Item): boolean {
  if (isEnergyItem(item)) return false;
  const block = normalizeCoreBlock(item);
  if (block === 'task') return true;
  if (item.type === 'task') return true;
  return /任务/.test(String(item.categoryKey || ''));
}

function isHabitLike(item: Item): boolean {
  const block = normalizeCoreBlock(item);
  return block === 'habit' || String(item.categoryKey || '').split('/')[0]?.trim() === '打卡';
}

function normalizeGoalPath(value: unknown): string {
  return String(value ?? '').trim().replace(/^#/, '');
}

function itemGoalIds(item: Item): string[] {
  return [item.goalId, ...(item.goalIds || [])].map((value) => String(value || '').trim()).filter(Boolean);
}

function itemGoalPaths(item: Item): string[] {
  return [item.goalPath, ...(item.goalPaths || [])].map(normalizeGoalPath).filter(Boolean);
}

function matchesEnergyGoal(energyItem: Item, candidate: Item): boolean {
  const energyIds = itemGoalIds(energyItem);
  const candidateIds = itemGoalIds(candidate);
  if (energyIds.length > 0) return candidateIds.some((id) => energyIds.includes(id));

  const energyPaths = itemGoalPaths(energyItem);
  if (energyPaths.length === 0) return true;
  const candidatePaths = itemGoalPaths(candidate);
  return candidatePaths.some((path) => energyPaths.includes(path));
}

function occurrenceDate(item: Item): string | undefined {
  return readText(item.date)
    || readText(item.doneDate)
    || readText(item.startDate)
    || readText(item.scheduledDate)
    || readText(item.dueDate)
    || readText(item.createdDate)
    || readText(item.extra?.['日期']);
}

function parseTimeMinutes(time: unknown): number | undefined {
  const match = readText(time)?.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
  return hour * 60 + minute;
}

function formatTimeMinutes(value: number): string {
  const normalized = ((Math.round(value) % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function dateOrdinal(date: string): number | undefined {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000);
}

function dateFromOrdinal(ordinal: number): string {
  return new Date(ordinal * 86_400_000).toISOString().slice(0, 10);
}

function absoluteMinute(date: string, time: string): number | undefined {
  const ordinal = dateOrdinal(date);
  const minutes = parseTimeMinutes(time);
  if (ordinal == null || minutes == null) return undefined;
  return ordinal * 1440 + minutes;
}

interface ActivityInterval {
  startAbsolute: number;
  endAbsolute: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  durationMinutes: number;
}

function resolveActivityInterval(item: Item): ActivityInterval | null {
  const date = occurrenceDate(item);
  if (!date) return null;
  const ordinal = dateOrdinal(date);
  if (ordinal == null) return null;

  const duration = readNumber(item.duration ?? item.extra?.['时长']);
  const safeDuration = duration != null && duration >= 0 ? duration : undefined;
  let startMinutes = parseTimeMinutes(item.startTime ?? item.extra?.['时间'] ?? item.extra?.['开始']);
  let endMinutes = parseTimeMinutes(item.endTime ?? item.extra?.['结束']);

  if (startMinutes == null && endMinutes == null) return null;
  if (startMinutes == null && endMinutes != null && safeDuration != null) startMinutes = endMinutes - safeDuration;
  if (endMinutes == null && startMinutes != null && safeDuration != null) endMinutes = startMinutes + safeDuration;
  if (startMinutes == null || endMinutes == null) return null;

  let startAbsolute = ordinal * 1440 + startMinutes;
  let endAbsolute = ordinal * 1440 + endMinutes;
  if (endAbsolute < startAbsolute) endAbsolute += 1440;
  if (safeDuration != null && Math.abs((endAbsolute - startAbsolute) - safeDuration) > 1) {
    endAbsolute = startAbsolute + safeDuration;
  }
  if (endAbsolute < startAbsolute) return null;

  const startDayOrdinal = Math.floor(startAbsolute / 1440);
  const endDayOrdinal = Math.floor(endAbsolute / 1440);
  return {
    startAbsolute,
    endAbsolute,
    startDate: dateFromOrdinal(startDayOrdinal),
    startTime: formatTimeMinutes(startAbsolute),
    endDate: dateFromOrdinal(endDayOrdinal),
    endTime: formatTimeMinutes(endAbsolute),
    durationMinutes: Math.max(0, Math.round(endAbsolute - startAbsolute)),
  };
}

function activityConfidence(relation: EnergyActivityRelation, gapMinutes: number): EnergyContextConfidence {
  if (relation === 'active' || gapMinutes <= 15) return 'high';
  if (gapMinutes <= 60) return 'medium';
  return 'low';
}

function buildActivityContext(item: Item, energyAbsolute: number, recentWindowMinutes: number): EnergyActivityContext | null {
  if (!isTaskLike(item)) return null;
  const interval = resolveActivityInterval(item);
  if (!interval) return null;

  if (energyAbsolute >= interval.startAbsolute && energyAbsolute <= interval.endAbsolute) {
    return {
      itemId: item.id,
      title: item.title || item.content || '未命名任务',
      relation: 'active',
      confidence: 'high',
      gapMinutes: 0,
      durationMinutes: interval.durationMinutes,
      startDate: interval.startDate,
      startTime: interval.startTime,
      endDate: interval.endDate,
      endTime: interval.endTime,
      item,
    };
  }

  const gapMinutes = Math.round(energyAbsolute - interval.endAbsolute);
  if (gapMinutes < 0 || gapMinutes > recentWindowMinutes) return null;
  return {
    itemId: item.id,
    title: item.title || item.content || '未命名任务',
    relation: 'recent',
    confidence: activityConfidence('recent', gapMinutes),
    gapMinutes,
    durationMinutes: interval.durationMinutes,
    startDate: interval.startDate,
    startTime: interval.startTime,
    endDate: interval.endDate,
    endTime: interval.endTime,
    item,
  };
}

function activityRank(activity: EnergyActivityContext): number {
  const relationRank = activity.relation === 'active' ? 0 : 1;
  const confidenceRank = activity.confidence === 'high' ? 0 : activity.confidence === 'medium' ? 1 : 2;
  return relationRank * 1_000_000 + confidenceRank * 100_000 + activity.gapMinutes;
}

function classifyDailySignal(item: Item): EnergyDailySignalKind | null {
  if (!isHabitLike(item)) return null;
  const text = [item.title, item.content, item.themePath, item.theme, item.categoryKey]
    .map((value) => String(value || ''))
    .join(' ');
  if (/睡眠|睡觉|睡醒/.test(text)) return 'sleep';
  if (/身体|体力|身体状态/.test(text)) return 'body';
  if (/运动|锻炼|健身|跑步|散步|八段锦|瑜伽|骑行|游泳/.test(text)) return 'exercise';
  return null;
}

function dailySignalLabel(kind: EnergyDailySignalKind): string {
  if (kind === 'sleep') return '睡眠';
  if (kind === 'body') return '身体';
  return '运动';
}

function dailySignalValue(item: Item): string | number | undefined {
  if (typeof item.rating === 'number') return item.rating;
  const extra = item.extra || {};
  for (const key of ['评分', '分数', '值', '状态']) {
    const value = extra[key];
    if (typeof value === 'number' || (typeof value === 'string' && value.trim())) return value;
  }
  return undefined;
}

function buildDailySignals(energyItem: Item, items: Item[], date: string): EnergyDailySignalContext[] {
  const byKind = new Map<EnergyDailySignalKind, EnergyDailySignalContext>();
  for (const item of items) {
    if (item.id === energyItem.id || !matchesEnergyGoal(energyItem, item)) continue;
    if (occurrenceDate(item) !== date) continue;
    const kind = classifyDailySignal(item);
    if (!kind || byKind.has(kind)) continue;
    byKind.set(kind, {
      itemId: item.id,
      kind,
      label: dailySignalLabel(kind),
      value: dailySignalValue(item),
      item,
    });
  }
  return (['sleep', 'body', 'exercise'] as const).map((kind) => byKind.get(kind)).filter((row): row is EnergyDailySignalContext => !!row);
}

/**
 * Build a runtime-only context for one exact Energy snapshot.
 * The resolver never writes inferred relationships back to Markdown: association is evidence, not causation.
 */
export function resolveEnergyContext(
  energyItem: Item,
  items: Item[],
  options: ResolveEnergyContextOptions = {}
): EnergyContext | null {
  const snapshot = readEnergyItemSnapshot(energyItem);
  if (!snapshot?.date || !snapshot.time) return null;
  const energyAbsolute = absoluteMinute(snapshot.date, snapshot.time);
  if (energyAbsolute == null) return null;

  const recentWindowMinutes = Math.max(0, options.recentWindowMinutes ?? DEFAULT_RECENT_WINDOW_MINUTES);
  const reliableWindowMinutes = Math.max(0, options.reliableWindowMinutes ?? DEFAULT_RELIABLE_WINDOW_MINUTES);
  const maxNearbyActivities = Math.max(1, options.maxNearbyActivities ?? DEFAULT_MAX_NEARBY_ACTIVITIES);

  const nearbyActivities = items
    .filter((item) => item.id !== energyItem.id && matchesEnergyGoal(energyItem, item))
    .map((item) => buildActivityContext(item, energyAbsolute, recentWindowMinutes))
    .filter((row): row is EnergyActivityContext => !!row)
    .sort((left, right) => activityRank(left) - activityRank(right))
    .slice(0, maxNearbyActivities);

  const primaryActivity = nearbyActivities.find((activity) => activity.relation === 'active' || activity.gapMinutes <= reliableWindowMinutes);
  const dailySignals = buildDailySignals(energyItem, items, snapshot.date);

  return { primaryActivity, nearbyActivities, dailySignals };
}
