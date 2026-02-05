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

import { minutesToTime, timeToMinutes } from '@core/public';

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

  const duration = parseDuration(durationVal);
  const startM = timeToMinutes(startVal);
  const endM = timeToMinutes(endVal);

  const changes: Record<string, any> = {};

  // 1) start + end -> duration
  if (startM !== null && endM !== null && lastChanged !== keys.durationKey) {
    let newDuration = endM - startM;
    if (newDuration < 0) newDuration += 24 * 60;
    const nextDuration = formatDuration(newDuration, durationVal, options.durationOutput);
    if (nextDuration !== durationVal) changes[keys.durationKey] = nextDuration;
    return changes;
  }

  // 2) start + duration -> end
  if (startM !== null && duration !== null && lastChanged !== keys.endKey) {
    const newEnd = minutesToTime(startM + duration);
    if (newEnd !== endVal) changes[keys.endKey] = newEnd;
    return changes;
  }

  // 3) end + duration -> start
  if (endM !== null && duration !== null && lastChanged !== keys.startKey) {
    const newStart = minutesToTime(endM - duration);
    if (newStart !== startVal) changes[keys.startKey] = newStart;
    return changes;
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

  const startM = timeToMinutes(next[keys.startKey]);
  const endM = timeToMinutes(next[keys.endKey]);
  const durationVal = next[keys.durationKey];
  const duration = parseDuration(durationVal);

  if (startM !== null && endM !== null) {
    let newDuration = endM - startM;
    if (newDuration < 0) newDuration += 24 * 60;
    next[keys.durationKey] = formatDuration(newDuration, durationVal, options.durationOutput);
    return next;
  }

  if (startM !== null && duration !== null) {
    next[keys.endKey] = minutesToTime(startM + duration);
    return next;
  }

  if (endM !== null && duration !== null) {
    next[keys.startKey] = minutesToTime(endM - duration);
    return next;
  }

  return next;
}
