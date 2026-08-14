// src/core/records/task/taskTime.ts
import { dayjs, minutesToTime, timeToMinutes } from '@/core/utils/date';

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
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function isClockValue(value: string): boolean {
  return timeToMinutes(value) !== null;
}

function isDateTimeValue(value: string): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}[T ]\d{1,2}:\d{2}/.test(value)) return false;
  return dayjs(value).isValid();
}

function normalizeTimeValue(value: string | null | undefined): string | undefined {
  const text = String(value || '').trim();
  if (!text) return undefined;
  return isClockValue(text) || isDateTimeValue(text) ? text : undefined;
}

function formatDateTimeLike(source: string, value: ReturnType<typeof dayjs>): string {
  // datetime-local controls require the T separator; readable persisted values use a space.
  if (source.includes('T')) return value.format('YYYY-MM-DDTHH:mm');
  return value.format('YYYY-MM-DD HH:mm');
}

export function deriveDurationFromRange(
  startTime?: string | null,
  endTime?: string | null,
): number | null {
  const start = String(startTime || '').trim();
  const end = String(endTime || '').trim();

  if (isDateTimeValue(start) && isDateTimeValue(end)) {
    const diff = dayjs(end).diff(dayjs(start), 'minute');
    return diff >= 0 ? diff : null;
  }

  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (startMinutes === null || endMinutes === null) return null;

  let duration = endMinutes - startMinutes;
  if (duration < 0) duration += 24 * 60;
  return duration;
}

export function deriveEndFromStartAndDuration(
  startTime?: string | null,
  duration?: number | string | null,
): string | null {
  const start = String(startTime || '').trim();
  const normalizedDuration = parseDuration(duration);
  if (normalizedDuration === null) return null;

  if (isDateTimeValue(start)) {
    return formatDateTimeLike(start, dayjs(start).add(normalizedDuration, 'minute'));
  }

  const startMinutes = timeToMinutes(start);
  if (startMinutes === null) return null;
  return minutesToTime(startMinutes + normalizedDuration) || null;
}

export function deriveStartFromEndAndDuration(
  endTime?: string | null,
  duration?: number | string | null,
): string | null {
  const end = String(endTime || '').trim();
  const normalizedDuration = parseDuration(duration);
  if (normalizedDuration === null) return null;

  if (isDateTimeValue(end)) {
    return formatDateTimeLike(end, dayjs(end).subtract(normalizedDuration, 'minute'));
  }

  const endMinutes = timeToMinutes(end);
  if (endMinutes === null) return null;
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
