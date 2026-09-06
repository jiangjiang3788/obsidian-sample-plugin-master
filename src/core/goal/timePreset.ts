import type { GoalDefinition, GoalTimePresetRevision, GoalTimePresetSnapshotEntry } from './types';
import { getParentGoalPath, normalizeGoalPath } from './path';

export const NATURAL_DAY_MINUTES = 24 * 60;
export const NATURAL_WEEK_MINUTES = 7 * NATURAL_DAY_MINUTES;
export const TIME_BALANCE_TOLERANCE_RATIO = 0.10;

export type GoalTargetSource = 'historical' | 'current-fallback' | 'current' | 'mixed';

export interface GoalTargetResolution {
  minutes: number | null;
  source: GoalTargetSource;
  usedHistoricalPreset: boolean;
  usedCurrentFallback: boolean;
}

export interface GoalTimePresetInfo {
  path: string;
  parentPath: string | null;
  targetPercent: number | null;
  weeklyTargetMinutes: number | null;
  directChildrenCount: number;
  directChildrenTargetMinutes: number;
  unallocatedMinutes: number;
  overallocatedMinutes: number;
  configured: boolean;
}

export interface RootTimePresetTotals {
  configuredPercent: number;
  configuredMinutes: number;
  reservePercent: number;
  reserveMinutes: number;
  overcommittedPercent: number;
  overcommittedMinutes: number;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function localDayOrdinal(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

function localClockMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60 + date.getMilliseconds() / 60_000;
}

function dateAtLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 0, 0, 0, 0);
}

export function isGoalTimePresetEligible(goal: GoalDefinition): boolean {
  return goal.status !== 'archived';
}

export function normalizeGoalTimePresetPercent(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100) return null;
  return round(number, 2);
}

export function normalizeWeeklyTargetMinutes(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return round(number, 2);
}

export function isRootGoalPath(path: string): boolean {
  const canonical = normalizeGoalPath(path);
  return !!canonical && getParentGoalPath(canonical) === null;
}

export function getGoalWeeklyTargetMinutes(goalPath: string, goals: GoalDefinition[]): number | null {
  const canonical = normalizeGoalPath(goalPath);
  if (!canonical) return null;
  const goal = (goals || []).find((candidate) => normalizeGoalPath(candidate.path) === canonical);
  if (!goal || !isGoalTimePresetEligible(goal)) return null;
  const parentPath = getParentGoalPath(canonical);
  if (parentPath === null) {
    const percent = normalizeGoalTimePresetPercent(goal.timePresetPercent);
    return percent === null ? null : round((NATURAL_WEEK_MINUTES * percent) / 100);
  }
  return normalizeWeeklyTargetMinutes(goal.weeklyTargetMinutes);
}

function weeklyTargetFromSnapshot(goalPath: string, entry: GoalTimePresetSnapshotEntry | undefined): number | null {
  const canonical = normalizeGoalPath(goalPath);
  if (!canonical || !entry) return null;
  if (getParentGoalPath(canonical) === null) {
    const percent = normalizeGoalTimePresetPercent(entry.timePresetPercent);
    return percent === null ? null : round((NATURAL_WEEK_MINUTES * percent) / 100);
  }
  return normalizeWeeklyTargetMinutes(entry.weeklyTargetMinutes);
}

export function getGoalTimePresetWeekStartKey(date: Date = new Date()): string {
  const day = dateAtLocalMidnight(date);
  const dayOfWeek = day.getDay(); // Sunday 0, Monday 1
  const deltaToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return localDateKey(addLocalDays(day, deltaToMonday));
}

export function buildGoalTimePresetSnapshot(goals: GoalDefinition[]): Record<string, GoalTimePresetSnapshotEntry> {
  const out: Record<string, GoalTimePresetSnapshotEntry> = {};
  for (const goal of goals || []) {
    if (!isGoalTimePresetEligible(goal)) continue;
    const path = normalizeGoalPath(goal.path);
    if (!path) continue;
    const entry: GoalTimePresetSnapshotEntry = {};
    if (getParentGoalPath(path) === null) {
      const percent = normalizeGoalTimePresetPercent(goal.timePresetPercent);
      if (percent !== null) entry.timePresetPercent = percent;
    } else {
      const minutes = normalizeWeeklyTargetMinutes(goal.weeklyTargetMinutes);
      if (minutes !== null) entry.weeklyTargetMinutes = minutes;
    }
    if (Object.keys(entry).length > 0) out[path] = entry;
  }
  return out;
}

export function upsertGoalTimePresetRevision(
  revisions: GoalTimePresetRevision[] | undefined,
  goals: GoalDefinition[],
  date: Date = new Date(),
): GoalTimePresetRevision[] {
  const effectiveWeekStart = getGoalTimePresetWeekStartKey(date);
  const nextRevision: GoalTimePresetRevision = {
    effectiveWeekStart,
    presets: buildGoalTimePresetSnapshot(goals),
  };
  const next = [...(revisions || [])].filter((revision) => revision.effectiveWeekStart !== effectiveWeekStart);
  next.push(nextRevision);
  next.sort((a, b) => a.effectiveWeekStart.localeCompare(b.effectiveWeekStart));
  return next;
}

function findEffectiveRevision(date: Date, revisions: GoalTimePresetRevision[] | undefined): GoalTimePresetRevision | null {
  const key = localDateKey(date);
  let found: GoalTimePresetRevision | null = null;
  for (const revision of revisions || []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(revision.effectiveWeekStart)) continue;
    if (revision.effectiveWeekStart <= key && (!found || revision.effectiveWeekStart > found.effectiveWeekStart)) found = revision;
  }
  return found;
}

function resolveWeeklyTargetForDate(
  goalPath: string,
  goals: GoalDefinition[],
  revisions: GoalTimePresetRevision[] | undefined,
  date: Date,
): { minutes: number | null; historical: boolean; fallback: boolean } {
  const revision = findEffectiveRevision(date, revisions);
  if (revision) {
    const fromRevision = weeklyTargetFromSnapshot(goalPath, revision.presets[normalizeGoalPath(goalPath)]);
    if (fromRevision !== null) return { minutes: fromRevision, historical: true, fallback: false };
    // Product contract: if that period had no preset for this Goal, reinterpret it with today's preset.
    return { minutes: getGoalWeeklyTargetMinutes(goalPath, goals), historical: false, fallback: true };
  }
  const current = getGoalWeeklyTargetMinutes(goalPath, goals);
  const hasAnyHistory = (revisions || []).length > 0;
  return { minutes: current, historical: false, fallback: hasAnyHistory };
}

export function getGoalTimePresetInfo(goalPath: string, goals: GoalDefinition[]): GoalTimePresetInfo | null {
  const canonical = normalizeGoalPath(goalPath);
  if (!canonical) return null;
  const goal = (goals || []).find((candidate) => normalizeGoalPath(candidate.path) === canonical);
  if (!goal) return null;
  const parentPath = getParentGoalPath(canonical);
  const weeklyTargetMinutes = getGoalWeeklyTargetMinutes(canonical, goals);
  const targetPercent = parentPath === null ? normalizeGoalTimePresetPercent(goal.timePresetPercent) : null;
  const directChildren = (goals || []).filter((candidate) => isGoalTimePresetEligible(candidate) && getParentGoalPath(candidate.path) === canonical);
  const directChildrenTargetMinutes = directChildren.reduce((sum, child) => sum + (getGoalWeeklyTargetMinutes(child.path, goals) || 0), 0);
  const unallocatedMinutes = weeklyTargetMinutes === null ? 0 : Math.max(0, weeklyTargetMinutes - directChildrenTargetMinutes);
  const overallocatedMinutes = weeklyTargetMinutes === null ? 0 : Math.max(0, directChildrenTargetMinutes - weeklyTargetMinutes);
  return {
    path: canonical,
    parentPath,
    targetPercent,
    weeklyTargetMinutes,
    directChildrenCount: directChildren.length,
    directChildrenTargetMinutes: round(directChildrenTargetMinutes),
    unallocatedMinutes: round(unallocatedMinutes),
    overallocatedMinutes: round(overallocatedMinutes),
    configured: weeklyTargetMinutes !== null,
  };
}

export function getRootTimePresetTotals(goals: GoalDefinition[]): RootTimePresetTotals {
  const configuredPercent = (goals || [])
    .filter((goal) => isGoalTimePresetEligible(goal) && getParentGoalPath(goal.path) === null)
    .reduce((sum, goal) => sum + (normalizeGoalTimePresetPercent(goal.timePresetPercent) || 0), 0);
  const configuredMinutes = (NATURAL_WEEK_MINUTES * configuredPercent) / 100;
  const reservePercent = Math.max(0, 100 - configuredPercent);
  const overcommittedPercent = Math.max(0, configuredPercent - 100);
  return {
    configuredPercent: round(configuredPercent),
    configuredMinutes: round(configuredMinutes),
    reservePercent: round(reservePercent),
    reserveMinutes: round((NATURAL_WEEK_MINUTES * reservePercent) / 100),
    overcommittedPercent: round(overcommittedPercent),
    overcommittedMinutes: round((NATURAL_WEEK_MINUTES * overcommittedPercent) / 100),
  };
}

/** Natural-time duration uses local calendar dates but treats every day as exactly 24 hours. */
export function getNaturalRangeMinutes(rangeStart: Date, rangeEnd: Date): number {
  const start = new Date(rangeStart);
  const end = new Date(rangeEnd);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) return 0;
  const dayDelta = localDayOrdinal(end) - localDayOrdinal(start);
  const value = dayDelta * NATURAL_DAY_MINUTES + localClockMinutes(end) - localClockMinutes(start) + (1 / 60_000);
  return Math.max(0, round(value, 4));
}

export function resolveGoalTargetForRange(
  goalPath: string,
  goals: GoalDefinition[],
  revisions: GoalTimePresetRevision[] | undefined,
  rangeStart: Date,
  rangeEnd: Date,
): GoalTargetResolution {
  const canonical = normalizeGoalPath(goalPath);
  const naturalMinutes = getNaturalRangeMinutes(rangeStart, rangeEnd);
  if (!canonical || naturalMinutes <= 0) {
    return { minutes: null, source: 'current', usedHistoricalPreset: false, usedCurrentFallback: false };
  }

  const startDay = dateAtLocalMidnight(rangeStart);
  const endDay = dateAtLocalMidnight(rangeEnd);
  let cursor = startDay;
  let total = 0;
  let hasConfiguredSegment = false;
  let usedHistoricalPreset = false;
  let usedCurrentFallback = false;
  let usedPlainCurrent = false;

  while (cursor <= endDay) {
    const dayStart = cursor;
    const nextDay = addLocalDays(cursor, 1);
    const isFirst = localDateKey(cursor) === localDateKey(rangeStart);
    const isLast = localDateKey(cursor) === localDateKey(rangeEnd);
    const startMinute = isFirst ? localClockMinutes(rangeStart) : 0;
    const endMinute = isLast ? localClockMinutes(rangeEnd) + (1 / 60_000) : NATURAL_DAY_MINUTES;
    const segmentMinutes = Math.max(0, Math.min(NATURAL_DAY_MINUTES, endMinute) - Math.max(0, startMinute));
    if (segmentMinutes > 0) {
      const resolved = resolveWeeklyTargetForDate(canonical, goals, revisions, dayStart);
      if (resolved.minutes !== null) {
        hasConfiguredSegment = true;
        total += (resolved.minutes / NATURAL_WEEK_MINUTES) * segmentMinutes;
      }
      if (resolved.historical) usedHistoricalPreset = true;
      else if (resolved.fallback) usedCurrentFallback = true;
      else usedPlainCurrent = true;
    }
    cursor = nextDay;
  }

  let source: GoalTargetSource = 'current';
  if (usedHistoricalPreset && usedCurrentFallback) source = 'mixed';
  else if (usedHistoricalPreset && usedPlainCurrent) source = 'mixed';
  else if (usedHistoricalPreset) source = 'historical';
  else if (usedCurrentFallback) source = 'current-fallback';

  return {
    minutes: hasConfiguredSegment ? round(total) : null,
    source,
    usedHistoricalPreset,
    usedCurrentFallback,
  };
}

export function getGoalTargetMinutesForRange(
  goalPath: string,
  goals: GoalDefinition[],
  rangeStart: Date,
  rangeEnd: Date,
  revisions?: GoalTimePresetRevision[],
): number | null {
  return resolveGoalTargetForRange(goalPath, goals, revisions, rangeStart, rangeEnd).minutes;
}
