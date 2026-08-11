// src/core/types/timer.ts
/**
 * TimerRuntimeState v2.
 *
 * TimerState is runtime-only and persists solely for pause/resume/restart recovery.
 * Completed work is a task-session Record and never remains in timer-state.json.
 */

export type TimerStatus = 'running' | 'paused';
export type TimerOrigin = 'timer' | 'energy-view';
export type TaskSessionResult = 'work-block-ended' | 'task-completed';
export type TaskSessionSource = TimerOrigin | 'unknown';

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
  /** First start of the current work block. Never reset by resume. */
  startedAt: number;
  /** Start of the currently running segment. Reset on resume. */
  startTime: number;
  /** Accumulated active seconds before the currently running segment. */
  elapsedSeconds: number;
  status: TimerStatus;
  source: TimerOrigin;
  /** Present when this work block began from the Energy task surface. Runtime baseline only. */
  energyContext?: EnergyTaskExecutionMeta;
}

export function isActiveTimerState(timer: TimerState | null | undefined): timer is TimerState {
  return !!timer && (timer.status === 'running' || timer.status === 'paused');
}
