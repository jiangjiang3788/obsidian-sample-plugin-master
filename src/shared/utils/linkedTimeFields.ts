// src/shared/utils/linkedTimeFields.ts
/**
 * Linked Time Fields Utils
 *
 * 用于“开始/结束/时长”三字段的联动计算。
 * 现在所有规则统一委托给 core/utils/taskTime.ts 的 applyTaskTimePolicy。
 */

import { applyTaskTimePolicy, type TaskTimeDirection, normalizeTaskTimeTriple } from '@core/public';

export interface LinkedTimeKeys {
  startKey: string;
  endKey: string;
  durationKey: string;
}

export type DurationOutputMode = 'preserve' | 'number' | 'string';

export interface LinkedTimeOptions {
  durationOutput?: DurationOutputMode;
  direction?: TaskTimeDirection;
}

const parseDuration = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
};

const formatDuration = (computed: number, existing: any, mode: DurationOutputMode = 'preserve') => {
  if (mode === 'number') return computed;
  if (mode === 'string') return String(computed);
  return typeof existing === 'string' ? String(computed) : computed;
};

export function computeLinkedTimeChanges(
  data: Record<string, any>,
  keys: LinkedTimeKeys,
  lastChanged: string | null | undefined,
  options: LinkedTimeOptions = {}
): Record<string, any> {
  const durationVal = data[keys.durationKey];
  const computed = applyTaskTimePolicy(
    {
      startTime: data[keys.startKey],
      endTime: data[keys.endKey],
      duration: parseDuration(durationVal),
    },
    {
      mode: 'interactive',
      direction: options.direction ?? 'forward',
      lastChanged: lastChanged === keys.startKey ? 'startTime' : lastChanged === keys.endKey ? 'endTime' : lastChanged === keys.durationKey ? 'duration' : null,
    },
  );

  const changes: Record<string, any> = {};
  if (computed.startTime !== undefined && computed.startTime !== data[keys.startKey]) changes[keys.startKey] = computed.startTime;
  if (computed.endTime !== undefined && computed.endTime !== data[keys.endKey]) changes[keys.endKey] = computed.endTime;
  if (computed.duration !== undefined) {
    const nextDuration = formatDuration(computed.duration, durationVal, options.durationOutput);
    if (nextDuration !== durationVal) changes[keys.durationKey] = nextDuration;
  }
  return changes;
}

export function finalizeLinkedTimeFields(
  data: Record<string, any>,
  keys: LinkedTimeKeys,
  options: LinkedTimeOptions = {}
): Record<string, any> {
  const next = { ...data };
  const durationVal = next[keys.durationKey];

  const normalized = options.direction
    ? applyTaskTimePolicy(
        {
          startTime: next[keys.startKey],
          endTime: next[keys.endKey],
          duration: durationVal,
        },
        { mode: 'finalize', direction: options.direction },
      )
    : normalizeTaskTimeTriple({
        startTime: next[keys.startKey],
        endTime: next[keys.endKey],
        duration: durationVal,
      });

  if (normalized.startTime !== undefined) next[keys.startKey] = normalized.startTime;
  if (normalized.endTime !== undefined) next[keys.endKey] = normalized.endTime;
  if (normalized.duration !== undefined) {
    next[keys.durationKey] = formatDuration(normalized.duration, durationVal, options.durationOutput);
  }

  return next;
}
