// src/core/types/timer.ts
/**
 * TimerRuntimeState v3.
 *
 * TimerState is runtime-only and persists solely for pause/resume/restart recovery.
 * Completed work is a task-session Record and never remains in timer-state.json.
 */

export type TimerStatus = 'running' | 'paused';
export type TimerOrigin = 'timer' | 'energy-view';
export type TaskSessionResult = 'work-block-ended' | 'task-completed';
export type TaskSessionSource = TimerOrigin | 'timeline' | 'unknown';

export interface EnergyTaskExecutionStart {
  baselineScore: number;
  baselineBrainScore?: number;
  baselinePhysicalScore?: number;
  baselineDate?: string;
  baselineTime?: string;
  baselineEnergyItemId?: string;
  /** Suggested work-block length. It is display-only in Timer; no reminder is fired. */
  suggestedDurationMinutes: number;
}

export interface EnergyTaskExecutionMeta extends EnergyTaskExecutionStart {
  startedAt: number;
}

/**
 * Optional low-friction Energy tracking for the current continuous work segment.
 *
 * This is deliberately separate from energyContext: energyContext belongs to
 * Energy-view recommendation metadata (for example suggested duration), while
 * energyTracking only says whether the current Timer segment has an explicit
 * before-Energy snapshot that may later be paired with an after snapshot.
 */
export interface TimerEnergyTrackingState {
  enabled: boolean;
  baselineScore?: number;
  baselineBrainScore?: number;
  baselinePhysicalScore?: number;
  baselineDate?: string;
  baselineTime?: string;
  baselineEnergyItemId?: string;
  startedAt?: number;
}

export interface TaskSessionCreateInput {
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  result: TaskSessionResult;
  source: TaskSessionSource;
  suggestedDurationMinutes?: number;
  startEnergyRecordId?: string;
}

export interface TimerState {
  id: string;
  taskId: string;
  /** First start of this Timer lifecycle. Kept for runtime diagnostics only. */
  startedAt: number;
  /** Start of the currently running continuous segment. Reset on every resume. */
  startTime: number;
  /** Accumulated active seconds from already persisted continuous segments. Display-only runtime total. */
  elapsedSeconds: number;
  status: TimerStatus;
  source: TimerOrigin;
  /** Present when this work block began from the Energy task surface. Recommendation/display metadata only. */
  energyContext?: EnergyTaskExecutionMeta;
  /** Optional before/after Energy tracking for the current continuous execution segment. */
  energyTracking?: TimerEnergyTrackingState;
}

export function isActiveTimerState(timer: TimerState | null | undefined): timer is TimerState {
  return !!timer && (timer.status === 'running' || timer.status === 'paused');
}
