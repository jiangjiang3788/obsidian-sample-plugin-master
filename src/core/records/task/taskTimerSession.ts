import type { TaskSessionCreateInput, TimerState } from '@/core/types/timer';

function roundedMinutes(totalSeconds: number): number {
  return Math.max(0, Math.round((Math.max(0, totalSeconds) / 60) * 100) / 100);
}

/**
 * Build the canonical persistent TaskSession for one currently-running Timer segment.
 *
 * Timer runtime is only recovery state. The persisted execution fact is derived from
 * the current segment startTime and the supplied end instant. Already-persisted paused
 * segments are represented by elapsedSeconds and are deliberately not folded back into
 * this Session.
 */
export function buildTimerSegmentSession(
  timer: TimerState,
  endedAt: number,
  result: TaskSessionCreateInput['result'],
): TaskSessionCreateInput | null {
  if (timer.status !== 'running') return null;
  if (!Number.isFinite(timer.startTime) || !Number.isFinite(endedAt) || endedAt <= timer.startTime) return null;

  const durationMinutes = roundedMinutes((endedAt - timer.startTime) / 1000);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return null;

  return {
    startedAt: new Date(timer.startTime).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    durationMinutes,
    result,
    source: timer.source,
    suggestedDurationMinutes: timer.energyContext?.suggestedDurationMinutes,
    startEnergyRecordId: timer.energyContext?.baselineEnergyItemId,
  };
}
