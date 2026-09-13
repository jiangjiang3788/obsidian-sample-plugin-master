import type { RecordEntity } from '@/core/records/RecordEntity';
import { asTaskSessionRecord } from '@/core/records/task/taskSession';
import type { GoalDefinition, GoalTimePresetRevision } from './types';
import { getGoalLeaf, getGoalPathCandidates, getParentGoalPath, normalizeGoalPath } from './path';
import { sortGoalsBySettingsOrder } from './order';
import {
  TIME_BALANCE_TOLERANCE_RATIO,
  getNaturalRangeMinutes,
  isGoalTimePresetEligible,
  resolveGoalTargetForRange,
} from './timePreset';
import type { GoalTargetSource } from './timePreset';

export const UNALLOCATED_GOAL_TIME_LABEL = '未归属';
export type GoalTimeBalanceState = 'unconfigured' | 'balanced' | 'low' | 'high' | 'insufficient' | 'pending';

export interface GoalTimeAllocationEntry {
  path: string;
  label: string;
  parentPath: string | null;
  depth: number;
  icon?: string;
  color?: string;
  /** Confirmed TaskSession time. It is observation, not proof that unrecorded time did not happen. */
  minutes: number;
  directMinutes: number;
  actualPercentOfNaturalTime: number;
  targetMinutes: number | null;
  targetPercentOfNaturalTime: number | null;
  targetSource: GoalTargetSource;
  lowerBoundMinutes: number | null;
  upperBoundMinutes: number | null;
  differenceMinutes: number | null;
  /** Observed-vs-target relative difference. UI only promotes it when balanceState is conclusive. */
  relativeDifferencePercent: number | null;
  balanceState: GoalTimeBalanceState;
}

export interface GoalTimeAllocationSummary {
  naturalMinutes: number;
  /** Natural minutes elapsed in the comparison window (full range for completed history). */
  comparisonNaturalMinutes: number;
  trackedMinutes: number;
  /** Union of TaskSession intervals, so overlapping sessions do not fake observation coverage. */
  observationCoverageMinutes: number;
  /** Elapsed natural time for which Think OS has no TaskSession observation. */
  unknownMinutes: number;
  /** Kept as an alias for older consumers; semantics are now unknown/unobserved, not "did not happen". */
  unrecordedMinutes: number;
  unallocatedMinutes: number;
  unallocatedPercentOfNaturalTime: number;
  rows: GoalTimeAllocationEntry[];
  rootRows: GoalTimeAllocationEntry[];
  hasConfiguredPreset: boolean;
  toleranceRatio: number;
}

interface Interval {
  start: number;
  end: number;
}

function roundValue(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sessionOverlap(
  session: ReturnType<typeof asTaskSessionRecord>,
  rangeStartMs: number,
  rangeEndExclusiveMs: number,
): { minutes: number; interval: Interval | null } {
  if (!session) return { minutes: 0, interval: null };
  const startedAtMs = Date.parse(session.sessionStartedAt);
  const endedAtMs = Date.parse(session.sessionEndedAt);
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(endedAtMs) || endedAtMs <= startedAtMs) return { minutes: 0, interval: null };
  const overlapStart = Math.max(startedAtMs, rangeStartMs);
  const overlapEnd = Math.min(endedAtMs, rangeEndExclusiveMs);
  if (overlapEnd <= overlapStart) return { minutes: 0, interval: null };
  const recordedMinutes = Number(session.sessionDurationMinutes);
  if (!Number.isFinite(recordedMinutes) || recordedMinutes <= 0) return { minutes: 0, interval: null };
  const wallMs = endedAtMs - startedAtMs;
  const overlapRatio = Math.min(1, Math.max(0, (overlapEnd - overlapStart) / wallMs));
  return {
    minutes: recordedMinutes * overlapRatio,
    interval: { start: overlapStart, end: overlapEnd },
  };
}

function unionIntervalMinutes(intervals: Interval[]): number {
  if (!intervals.length) return 0;
  const ordered = intervals
    .filter((interval) => Number.isFinite(interval.start) && Number.isFinite(interval.end) && interval.end > interval.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  if (!ordered.length) return 0;
  let totalMs = 0;
  let currentStart = ordered[0].start;
  let currentEnd = ordered[0].end;
  for (let i = 1; i < ordered.length; i += 1) {
    const next = ordered[i];
    if (next.start <= currentEnd) {
      currentEnd = Math.max(currentEnd, next.end);
    } else {
      totalMs += currentEnd - currentStart;
      currentStart = next.start;
      currentEnd = next.end;
    }
  }
  totalMs += currentEnd - currentStart;
  return totalMs / 60_000;
}

function asRangeBoundary(value: Date, fallback: number): number {
  const ms = value instanceof Date ? value.getTime() : Number.NaN;
  return Number.isFinite(ms) ? ms : fallback;
}

function resolveBalanceState(args: {
  targetMinutes: number | null;
  actualMinutes: number;
  unknownMinutes: number;
  rangeHasStarted: boolean;
}): GoalTimeBalanceState {
  const { targetMinutes, actualMinutes, unknownMinutes, rangeHasStarted } = args;
  if (targetMinutes === null) return 'unconfigured';
  if (!rangeHasStarted) return 'pending';
  const lower = targetMinutes * (1 - TIME_BALANCE_TOLERANCE_RATIO);
  const upper = targetMinutes * (1 + TIME_BALANCE_TOLERANCE_RATIO);

  // Positive evidence is strong: once confirmed actual already crosses the upper bound,
  // missing observations cannot make it "not high" again.
  if (actualMinutes > upper) return 'high';

  // Missing TaskSession means unknown, not zero. A low conclusion is allowed only when
  // even assigning every unknown minute to this Goal cannot reach the lower bound.
  const maximumPossible = actualMinutes + Math.max(0, unknownMinutes);
  if (maximumPossible < lower) return 'low';

  // Balanced is also a factual conclusion: unknown time must be too small to push the
  // Goal outside the quiet band.
  if (actualMinutes >= lower && actualMinutes <= upper && maximumPossible <= upper) return 'balanced';

  return 'insufficient';
}

export function buildGoalTimeAllocationSummary(args: {
  records: RecordEntity[];
  goals: GoalDefinition[];
  presetRevisions?: GoalTimePresetRevision[];
  rangeStart: Date;
  rangeEnd: Date;
}): GoalTimeAllocationSummary {
  const { records = [], goals = [], presetRevisions = [], rangeStart, rangeEnd } = args;
  const rangeStartMs = asRangeBoundary(rangeStart, 0);
  const rangeEndMs = asRangeBoundary(rangeEnd, rangeStartMs);
  const rangeEndExclusiveMs = Math.max(rangeStartMs, rangeEndMs + 1);
  const naturalMinutes = getNaturalRangeMinutes(rangeStart, rangeEnd);
  const nowMs = Date.now();
  const rangeHasStarted = nowMs >= rangeStartMs;
  const comparisonEndExclusiveMs = rangeHasStarted ? Math.min(rangeEndExclusiveMs, nowMs) : rangeStartMs;
  const comparisonEnd = new Date(Math.max(rangeStartMs, comparisonEndExclusiveMs - 1));
  const comparisonNaturalMinutes = rangeHasStarted ? getNaturalRangeMinutes(rangeStart, comparisonEnd) : 0;

  const taskById = new Map<string, RecordEntity>();
  for (const record of records) {
    if (record?.recordType === 'task' && record.id) taskById.set(record.id, record);
  }

  const goalByPath = new Map<string, GoalDefinition>();
  for (const goal of goals) {
    const path = normalizeGoalPath(goal.path);
    if (path && isGoalTimePresetEligible(goal)) goalByPath.set(path, goal);
  }

  const directMinutes = new Map<string, number>();
  const rolledUpMinutes = new Map<string, number>();
  const observationIntervals: Interval[] = [];
  let trackedMinutes = 0;
  let unallocatedMinutes = 0;

  for (const record of records) {
    const session = asTaskSessionRecord(record);
    if (!session) continue;
    const overlap = sessionOverlap(session, rangeStartMs, comparisonEndExclusiveMs);
    const minutes = overlap.minutes;
    if (minutes <= 0) continue;
    trackedMinutes += minutes;
    if (overlap.interval) observationIntervals.push(overlap.interval);

    const task = taskById.get(session.taskId);
    // TaskSession is the historical execution fact, so its Goal snapshot owns
    // attribution. Fall back to the current Task only for legacy Sessions that
    // predate persisted session.goalPath. A later Task move must not rewrite history.
    const sessionGoalPath = normalizeGoalPath(session.goalPath);
    const attributedGoalPath = sessionGoalPath || normalizeGoalPath(task?.goalPath);
    if (!attributedGoalPath || !goalByPath.has(attributedGoalPath)) {
      unallocatedMinutes += minutes;
      continue;
    }

    directMinutes.set(attributedGoalPath, (directMinutes.get(attributedGoalPath) || 0) + minutes);
    for (const candidate of getGoalPathCandidates(attributedGoalPath)) {
      if (!goalByPath.has(candidate)) continue;
      rolledUpMinutes.set(candidate, (rolledUpMinutes.get(candidate) || 0) + minutes);
    }
  }

  const observationCoverageMinutes = Math.min(comparisonNaturalMinutes, unionIntervalMinutes(observationIntervals));
  const unknownMinutes = Math.max(0, comparisonNaturalMinutes - observationCoverageMinutes);

  const orderedGoals = sortGoalsBySettingsOrder(goals.filter(isGoalTimePresetEligible));
  const rows = orderedGoals
    .map((goal): GoalTimeAllocationEntry | null => {
      const path = normalizeGoalPath(goal.path);
      if (!path) return null;
      const minutes = rolledUpMinutes.get(path) || 0;
      const targetResolution = rangeHasStarted
        ? resolveGoalTargetForRange(path, goals, presetRevisions, rangeStart, comparisonEnd)
        : { minutes: null, source: 'current' as const, usedHistoricalPreset: false, usedCurrentFallback: false };
      const targetMinutes = targetResolution.minutes;
      if (minutes <= 0 && targetMinutes === null) return null;
      const parentPath = getParentGoalPath(path);
      const actualPercentOfNaturalTime = comparisonNaturalMinutes > 0 ? (minutes / comparisonNaturalMinutes) * 100 : 0;
      const targetPercentOfNaturalTime = targetMinutes !== null && comparisonNaturalMinutes > 0
        ? (targetMinutes / comparisonNaturalMinutes) * 100
        : null;
      const lowerBoundMinutes = targetMinutes === null ? null : targetMinutes * (1 - TIME_BALANCE_TOLERANCE_RATIO);
      const upperBoundMinutes = targetMinutes === null ? null : targetMinutes * (1 + TIME_BALANCE_TOLERANCE_RATIO);
      const differenceMinutes = targetMinutes === null ? null : minutes - targetMinutes;
      const relativeDifferencePercent = targetMinutes !== null && targetMinutes > 0
        ? (differenceMinutes! / targetMinutes) * 100
        : null;
      return {
        path,
        label: getGoalLeaf(path) || path,
        parentPath: parentPath && goalByPath.has(parentPath) ? parentPath : null,
        depth: path.split('/').filter(Boolean).length - 1,
        ...(goal.icon ? { icon: goal.icon } : null),
        ...(goal.color ? { color: goal.color } : null),
        minutes: roundValue(minutes),
        directMinutes: roundValue(directMinutes.get(path) || 0),
        actualPercentOfNaturalTime: roundValue(actualPercentOfNaturalTime),
        targetMinutes: targetMinutes === null ? null : roundValue(targetMinutes),
        targetPercentOfNaturalTime: targetPercentOfNaturalTime === null ? null : roundValue(targetPercentOfNaturalTime),
        targetSource: targetResolution.source,
        lowerBoundMinutes: lowerBoundMinutes === null ? null : roundValue(lowerBoundMinutes),
        upperBoundMinutes: upperBoundMinutes === null ? null : roundValue(upperBoundMinutes),
        differenceMinutes: differenceMinutes === null ? null : roundValue(differenceMinutes),
        relativeDifferencePercent: relativeDifferencePercent === null ? null : roundValue(relativeDifferencePercent),
        balanceState: resolveBalanceState({
          targetMinutes,
          actualMinutes: minutes,
          unknownMinutes,
          rangeHasStarted,
        }),
      };
    })
    .filter((row): row is GoalTimeAllocationEntry => row !== null);

  const rootRows = rows.filter((row) => row.parentPath === null);
  const unallocatedPercentOfNaturalTime = comparisonNaturalMinutes > 0 ? (unallocatedMinutes / comparisonNaturalMinutes) * 100 : 0;

  return {
    naturalMinutes: roundValue(naturalMinutes),
    comparisonNaturalMinutes: roundValue(comparisonNaturalMinutes),
    trackedMinutes: roundValue(trackedMinutes),
    observationCoverageMinutes: roundValue(observationCoverageMinutes),
    unknownMinutes: roundValue(unknownMinutes),
    unrecordedMinutes: roundValue(unknownMinutes),
    unallocatedMinutes: roundValue(unallocatedMinutes),
    unallocatedPercentOfNaturalTime: roundValue(unallocatedPercentOfNaturalTime),
    rows,
    rootRows,
    hasConfiguredPreset: rows.some((row) => row.targetMinutes !== null),
    toleranceRatio: TIME_BALANCE_TOLERANCE_RATIO,
  };
}
