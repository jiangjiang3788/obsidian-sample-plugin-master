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
  /** Present when this work block began from the Energy task surface. Runtime baseline only. */
  energyContext?: EnergyTaskExecutionMeta;
}

export function isActiveTimerState(timer: TimerState | null | undefined): timer is TimerState {
  return !!timer && (timer.status === 'running' || timer.status === 'paused');
}
