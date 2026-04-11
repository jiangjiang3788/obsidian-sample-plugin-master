// src/core/utils/taskTime.ts
import { minutesToTime, timeToMinutes } from './date';

export interface TaskTimeTripleInput {
  startTime?: string | null;
  endTime?: string | null;
  duration?: number | string | null;
}

export interface TaskTimeTripleOutput {
  startTime?: string;
  endTime?: string;
  duration?: number;
}

function parseDuration(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeTimeValue(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return timeToMinutes(value) === null ? undefined : value;
}

export function deriveDurationFromRange(
  startTime?: string | null,
  endTime?: string | null,
): number | null {
  const startMinutes = timeToMinutes(String(startTime || ''));
  const endMinutes = timeToMinutes(String(endTime || ''));
  if (startMinutes === null || endMinutes === null) return null;

  let duration = endMinutes - startMinutes;
  if (duration < 0) duration += 24 * 60;
  return duration;
}

export function deriveEndFromStartAndDuration(
  startTime?: string | null,
  duration?: number | string | null,
): string | null {
  const startMinutes = timeToMinutes(String(startTime || ''));
  const normalizedDuration = parseDuration(duration);
  if (startMinutes === null || normalizedDuration === null) return null;

  return minutesToTime(startMinutes + normalizedDuration) || null;
}

export function deriveStartFromEndAndDuration(
  endTime?: string | null,
  duration?: number | string | null,
): string | null {
  const endMinutes = timeToMinutes(String(endTime || ''));
  const normalizedDuration = parseDuration(duration);
  if (endMinutes === null || normalizedDuration === null) return null;

  return minutesToTime(endMinutes - normalizedDuration) || null;
}


export type TaskTimeDirection = 'forward' | 'backward';

export interface TaskTimePolicyOptions extends TaskTimeTripleInput {
  direction?: TaskTimeDirection;
  lastChanged?: 'startTime' | 'endTime' | 'duration' | null;
  mode?: 'interactive' | 'finalize';
}

export function applyTaskTimePolicy(input: TaskTimePolicyOptions): TaskTimeTripleOutput {
  const startTime = normalizeTimeValue(input.startTime);
  const endTime = normalizeTimeValue(input.endTime);
  const duration = parseDuration(input.duration);
  const direction: TaskTimeDirection = input.direction === 'backward' ? 'backward' : 'forward';
  const mode = input.mode ?? 'finalize';
  const lastChanged = input.lastChanged ?? null;

  if (startTime && endTime && (mode === 'finalize' || lastChanged !== 'duration')) {
    return {
      startTime,
      endTime,
      duration: deriveDurationFromRange(startTime, endTime) ?? duration ?? undefined,
    };
  }

  if (direction === 'backward') {
    if (endTime && duration !== null && (mode === 'finalize' || lastChanged !== 'startTime')) {
      return {
        startTime: deriveStartFromEndAndDuration(endTime, duration) ?? undefined,
        endTime,
        duration,
      };
    }
    if (startTime && duration !== null && mode === 'finalize') {
      return {
        startTime,
        endTime: deriveEndFromStartAndDuration(startTime, duration) ?? undefined,
        duration,
      };
    }
  }

  if (startTime && duration !== null && (mode === 'finalize' || lastChanged !== 'endTime')) {
    return {
      startTime,
      endTime: deriveEndFromStartAndDuration(startTime, duration) ?? undefined,
      duration,
    };
  }

  if (endTime && duration !== null && mode === 'finalize') {
    return {
      startTime: deriveStartFromEndAndDuration(endTime, duration) ?? undefined,
      endTime,
      duration,
    };
  }

  return {
    startTime,
    endTime,
    duration: duration ?? undefined,
  };
}
export function normalizeTaskTimeTriple(input: TaskTimeTripleInput): TaskTimeTripleOutput {
  return applyTaskTimePolicy({ ...input, mode: 'finalize' });
}
