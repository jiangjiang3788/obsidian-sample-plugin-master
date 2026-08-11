// src/core/types/timer.ts
/** Timer execution state. Energy context is optional and never changes Timer UI ownership. */

export type TimerStatus = 'running' | 'paused' | 'awaiting-energy' | 'feedback-recorded';

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

export interface EnergyTaskExecutionFeedback {
  score: number;
  brainScore?: number;
  physicalScore?: number;
  delta: number;
  delayMinutes: number;
  capturedAt: number;
  date: string;
  time: string;
}

export interface TimerState {
  id: string;
  taskId: string;
  startTime: number;
  elapsedSeconds: number;
  status: TimerStatus;
  /** Present when this work block began from the Energy task surface. */
  energyContext?: EnergyTaskExecutionMeta;
  completedAt?: number;
  /** Bound conservatively to the next reliable Energy snapshot after the work block. */
  energyFeedback?: EnergyTaskExecutionFeedback;
}

export function isActiveTimerState(timer: TimerState | null | undefined): timer is TimerState {
  return !!timer && (timer.status === 'running' || timer.status === 'paused');
}
