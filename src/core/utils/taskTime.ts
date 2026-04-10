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

export type TaskTimeDirection = 'forward' | 'backward';
export type TaskTimeMode = 'interactive' | 'finalize';
export type TaskTimeField = 'startTime' | 'endTime' | 'duration' | null;

export interface TaskTimePolicyOptions {
  mode?: TaskTimeMode;
  direction?: TaskTimeDirection;
  lastChanged?: TaskTimeField;
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

export function deriveDurationFromRange(startTime?: string | null, endTime?: string | null): number | null {
  const startMinutes = timeToMinutes(String(startTime || ''));
  const endMinutes = timeToMinutes(String(endTime || ''));
  if (startMinutes === null || endMinutes === null) return null;

  let duration = endMinutes - startMinutes;
  if (duration < 0) duration += 24 * 60;
  return duration;
}

export function deriveEndFromStartAndDuration(startTime?: string | null, duration?: number | string | null): string | null {
  const startMinutes = timeToMinutes(String(startTime || ''));
  const normalizedDuration = parseDuration(duration);
  if (startMinutes === null || normalizedDuration === null) return null;
  return minutesToTime(startMinutes + normalizedDuration) || null;
}

export function deriveStartFromEndAndDuration(endTime?: string | null, duration?: number | string | null): string | null {
  const endMinutes = timeToMinutes(String(endTime || ''));
  const normalizedDuration = parseDuration(duration);
  if (endMinutes === null || normalizedDuration === null) return null;
  return minutesToTime(endMinutes - normalizedDuration) || null;
}

/**
 * 唯一真源：所有“时间 / 结束 / 时长”推导都应统一走这里。
 * - interactive: 用于输入中联动，只返回“需要自动更新”的字段
 * - finalize:    用于保存前 / 服务层归一，返回归一后的完整三元组
 */
export function applyTaskTimePolicy(input: TaskTimeTripleInput, options: TaskTimePolicyOptions = {}): TaskTimeTripleOutput {
  const mode = options.mode ?? 'finalize';
  const direction = options.direction ?? 'forward';
  const lastChanged = options.lastChanged ?? null;

  const startTime = normalizeTimeValue(input.startTime);
  const endTime = normalizeTimeValue(input.endTime);
  const duration = parseDuration(input.duration);

  const derivedDuration = startTime && endTime ? deriveDurationFromRange(startTime, endTime) : null;

  if (mode === 'interactive') {
    if (derivedDuration !== null && lastChanged !== 'duration') {
      return { duration: derivedDuration };
    }

    if (duration !== null) {
      if (direction === 'forward' && startTime && lastChanged !== 'endTime') {
        const nextEnd = deriveEndFromStartAndDuration(startTime, duration);
        if (nextEnd && nextEnd !== endTime) return { endTime: nextEnd };
      }
      if (direction === 'backward' && endTime && lastChanged !== 'startTime') {
        const nextStart = deriveStartFromEndAndDuration(endTime, duration);
        if (nextStart && nextStart !== startTime) return { startTime: nextStart };
      }
    }

    return {};
  }

  if (derivedDuration !== null) {
    return { startTime, endTime, duration: derivedDuration };
  }

  if (duration !== null) {
    if (direction === 'forward') {
      if (startTime) {
        return {
          startTime,
          endTime: deriveEndFromStartAndDuration(startTime, duration) ?? endTime,
          duration,
        };
      }
      return { startTime, endTime, duration };
    }

    if (endTime) {
      return {
        startTime: deriveStartFromEndAndDuration(endTime, duration) ?? startTime,
        endTime,
        duration,
      };
    }
  }

  return { startTime, endTime, duration: duration ?? undefined };
}

/**
 * 兼容旧调用：
 * - start + end -> duration
 * - start + duration -> end
 * - end + duration -> start
 * 内部已统一委托给 applyTaskTimePolicy，不再维护第二套规则。
 */
export function normalizeTaskTimeTriple(input: TaskTimeTripleInput): TaskTimeTripleOutput {
  const hasStart = !!normalizeTimeValue(input.startTime);
  const hasEnd = !!normalizeTimeValue(input.endTime);
  const hasDuration = parseDuration(input.duration) !== null;
  const direction: TaskTimeDirection = !hasStart && hasEnd && hasDuration ? 'backward' : 'forward';
  return applyTaskTimePolicy(input, { mode: 'finalize', direction });
}
