// src/shared/utils/linkedTimeFields.ts
/**
 * Linked Time Fields Utils
 *
 * 用于“开始/结束/时长”三字段的联动计算。
 *
 * 场景：
 * - QuickInputEditor: (时间 / 结束 / 时长)
 * - EditTaskModal: (startTime / endTime / duration)
 *
 * 设计目标：
 * - 把重复的计算逻辑收敛成一个可复用工具
 * - 保持现有交互语义：尊重 lastChanged，避免反向覆盖用户刚输入的字段
 */

import { applyTaskTimePolicy, type TaskTimeDirection, normalizeTaskTimeTriple } from '@core/public';

export interface LinkedTimeKeys {
  startKey: string;
  endKey: string;
  durationKey: string;
}

export type DurationOutputMode = 'preserve' | 'number' | 'string';

export interface LinkedTimeOptions {
  /**
   * duration 的输出形态：
   * - preserve: 跟随原值类型（string/number）
   * - number:   强制 number
   * - string:   强制 string
   */
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
  // preserve
  return typeof existing === 'string' ? String(computed) : computed;
};

/**
 * computeLinkedTimeChanges
 *
 * 根据当前 data 与 lastChanged 计算“应当被自动更新”的字段。
 *
 * 联动规则（与项目现有逻辑一致）：
 * 1) start + end -> 推导 duration（除非 lastChanged 是 duration）
 * 2) start + duration -> 推导 end（除非 lastChanged 是 end）
 * 3) end + duration -> 推导 start（除非 lastChanged 是 start）
 */
export function computeLinkedTimeChanges(
  data: Record<string, any>,
  keys: LinkedTimeKeys,
  lastChanged: string | null | undefined,
  options: LinkedTimeOptions = {}
): Record<string, any> {
  const startVal = data[keys.startKey];
  const endVal = data[keys.endKey];
  const durationVal = data[keys.durationKey];

  const normalizedChanged =
    lastChanged === keys.startKey ? 'startTime' :
    lastChanged === keys.endKey ? 'endTime' :
    lastChanged === keys.durationKey ? 'duration' : null;

  const normalized = applyTaskTimePolicy({
    startTime: startVal,
    endTime: endVal,
    duration: durationVal,
    direction: options.direction,
    lastChanged: normalizedChanged,
    mode: 'interactive',
  });

  const changes: Record<string, any> = {};

  if (normalized.startTime !== undefined && normalized.startTime !== startVal) {
    changes[keys.startKey] = normalized.startTime;
  }
  if (normalized.endTime !== undefined && normalized.endTime !== endVal) {
    changes[keys.endKey] = normalized.endTime;
  }
  if (normalized.duration !== undefined) {
    const nextDuration = formatDuration(normalized.duration, durationVal, options.durationOutput);
    if (nextDuration !== durationVal) changes[keys.durationKey] = nextDuration;
  }

  return changes;
}

/**
 * finalizeLinkedTimeFields
 *
 * “保存前”最终修正：不依赖 lastChanged（以数据一致性为准）。
 * - start + end -> duration（写入 number 或 string 由原 duration 形态决定）
 * - start + duration -> end
 * - end + duration -> start
 */
export function finalizeLinkedTimeFields(
  data: Record<string, any>,
  keys: LinkedTimeKeys,
  options: LinkedTimeOptions = {}
): Record<string, any> {
  const next = { ...data };
  const durationVal = next[keys.durationKey];

  const normalized = normalizeTaskTimeTriple({
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
