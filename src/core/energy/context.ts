import type { RecordViewItem } from '@/core/records/RecordEntity';
import { isEnergyItem, readEnergyItemSnapshot } from './item';
import { asTaskSessionRecord } from '../records/task/taskSession';

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
  item: RecordViewItem;
}

export interface EnergyDailySignalContext {
  itemId: string;
  kind: EnergyDailySignalKind;
  label: string;
  value?: string | number;
  item: RecordViewItem;
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

function normalizeCoreBlock(item: RecordViewItem): string {
  return String(item.coreBlock || item.extra?.['核心Block'] || '')
    .replace(/^core\./i, '')
    .trim()
    .toLowerCase();
}

function isHabitLike(item: RecordViewItem): boolean {
  return normalizeCoreBlock(item) === 'habit';
}

function matchesEnergyGoal(energyItem: RecordViewItem, candidate: RecordViewItem): boolean {
  const energyGoalId = String(energyItem.goalId || '').trim();
  if (!energyGoalId) return true;
  return String(candidate.goalId || '').trim() === energyGoalId;
}

function occurrenceDate(item: RecordViewItem): string | undefined {
  if (item.coreBlock === 'task-session' && item.sessionStartedAt) {
    const value = new Date(item.sessionStartedAt);
    if (Number.isFinite(value.getTime())) {
      return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    }
  }
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

function localSessionParts(value: string): { date: string; time: string } | null {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return {
    date: `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`,
    time: `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`,
  };
}

interface ActivityInterval {
  session: RecordViewItem;
  task: RecordViewItem;
  startAbsolute: number;
  endAbsolute: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  durationMinutes: number;
}

function resolveActivityInterval(record: RecordViewItem, byId: Map<string, RecordViewItem>): ActivityInterval | null {
  const session = asTaskSessionRecord(record);
  if (!session) return null;
  const task = byId.get(session.taskId);
  if (!task || task.coreBlock !== 'task') return null;
  const start = localSessionParts(session.sessionStartedAt);
  const end = localSessionParts(session.sessionEndedAt);
  if (!start || !end) return null;
  const startAbsolute = absoluteMinute(start.date, start.time);
  const endAbsoluteRaw = absoluteMinute(end.date, end.time);
  if (startAbsolute == null || endAbsoluteRaw == null) return null;
  const duration = Number(session.sessionDurationMinutes);
  if (!Number.isFinite(duration) || duration < 0) return null;
  const endAbsolute = Math.max(endAbsoluteRaw, startAbsolute + duration);
  return {
    session,
    task,
    startAbsolute,
    endAbsolute,
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    durationMinutes: Math.round(duration),
  };
}

function activityConfidence(relation: EnergyActivityRelation, gapMinutes: number): EnergyContextConfidence {
  if (relation === 'active' || gapMinutes <= 15) return 'high';
  if (gapMinutes <= 60) return 'medium';
  return 'low';
}

function buildActivityContext(
  record: RecordViewItem,
  byId: Map<string, RecordViewItem>,
  energyItemId: string,
  energyAbsolute: number,
  recentWindowMinutes: number,
): EnergyActivityContext | null {
  const interval = resolveActivityInterval(record, byId);
  if (!interval) return null;
  const session = asTaskSessionRecord(record)!;
  const directStart = session.startEnergyRecordId === energyItemId;
  const directEnd = session.endEnergyRecordId === energyItemId;

  if (directStart || (energyAbsolute >= interval.startAbsolute && energyAbsolute <= interval.endAbsolute)) {
    return {
      itemId: session.id,
      title: interval.task.content || interval.task.title || '未命名任务',
      relation: 'active',
      confidence: 'high',
      gapMinutes: 0,
      durationMinutes: interval.durationMinutes,
      startDate: interval.startDate,
      startTime: interval.startTime,
      endDate: interval.endDate,
      endTime: interval.endTime,
      item: interval.task,
    };
  }

  const gapMinutes = directEnd ? 0 : Math.round(energyAbsolute - interval.endAbsolute);
  if (gapMinutes < 0 || gapMinutes > recentWindowMinutes) return null;
  return {
    itemId: session.id,
    title: interval.task.content || interval.task.title || '未命名任务',
    relation: 'recent',
    confidence: directEnd ? 'high' : activityConfidence('recent', gapMinutes),
    gapMinutes,
    durationMinutes: interval.durationMinutes,
    startDate: interval.startDate,
    startTime: interval.startTime,
    endDate: interval.endDate,
    endTime: interval.endTime,
    item: interval.task,
  };
}

function activityRank(activity: EnergyActivityContext): number {
  const relationRank = activity.relation === 'active' ? 0 : 1;
  const confidenceRank = activity.confidence === 'high' ? 0 : activity.confidence === 'medium' ? 1 : 2;
  return relationRank * 1_000_000 + confidenceRank * 100_000 + activity.gapMinutes;
}

function classifyDailySignal(item: RecordViewItem): EnergyDailySignalKind | null {
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

function dailySignalValue(item: RecordViewItem): string | number | undefined {
  if (typeof item.rating === 'number') return item.rating;
  const extra = item.extra || {};
  for (const key of ['评分', '分数', '值', '状态']) {
    const value = extra[key];
    if (typeof value === 'number' || (typeof value === 'string' && value.trim())) return value;
  }
  return undefined;
}

function buildDailySignals(energyItem: RecordViewItem, items: RecordViewItem[], date: string): EnergyDailySignalContext[] {
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
  energyItem: RecordViewItem,
  items: RecordViewItem[],
  options: ResolveEnergyContextOptions = {}
): EnergyContext | null {
  const snapshot = readEnergyItemSnapshot(energyItem);
  if (!snapshot?.date || !snapshot.time) return null;
  const energyAbsolute = absoluteMinute(snapshot.date, snapshot.time);
  if (energyAbsolute == null) return null;

  const recentWindowMinutes = Math.max(0, options.recentWindowMinutes ?? DEFAULT_RECENT_WINDOW_MINUTES);
  const reliableWindowMinutes = Math.max(0, options.reliableWindowMinutes ?? DEFAULT_RELIABLE_WINDOW_MINUTES);
  const maxNearbyActivities = Math.max(1, options.maxNearbyActivities ?? DEFAULT_MAX_NEARBY_ACTIVITIES);

  const byId = new Map(items.map((item) => [item.id, item] as const));
  const nearbyActivities = items
    .filter((item) => item.id !== energyItem.id && item.coreBlock === 'task-session')
    .map((item) => buildActivityContext(item, byId, energyItem.id, energyAbsolute, recentWindowMinutes))
    .filter((row): row is EnergyActivityContext => !!row)
    .sort((left, right) => activityRank(left) - activityRank(right))
    .slice(0, maxNearbyActivities);

  const primaryActivity = nearbyActivities.find((activity) => activity.relation === 'active' || activity.gapMinutes <= reliableWindowMinutes);
  const dailySignals = buildDailySignals(energyItem, items, snapshot.date);

  return { primaryActivity, nearbyActivities, dailySignals };
}
