import { ENERGY_QUICK_LEVELS, type EnergyQuickLevel } from './types';

export const ENERGY_QUICK_LEVEL_LABELS: Record<EnergyQuickLevel, string> = {
  20: '很低',
  40: '偏低',
  60: '一般',
  80: '较高',
  100: '充沛',
};

/** 百分制真值统一限制到 0-100，并取最接近的整数。详细模式允许 0。 */
export function normalizeEnergyScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(100, Math.max(0, value)));
}

/** 将任意百分制评分映射到最近的快捷档位，仅用于展示/聚合；不覆盖原始百分制值。 */
export function toEnergyQuickLevel(value: number): EnergyQuickLevel {
  const score = normalizeEnergyScore(value);
  return ENERGY_QUICK_LEVELS.reduce((best, candidate) => (
    Math.abs(candidate - score) < Math.abs(best - score) ? candidate : best
  ), ENERGY_QUICK_LEVELS[0]);
}

export function isEnergyQuickLevel(value: number): value is EnergyQuickLevel {
  return (ENERGY_QUICK_LEVELS as readonly number[]).includes(value);
}

/** 详细模式 v1：综合精力 = 脑力与体力的等权算术平均。 */
export function calculateDetailedEnergyScore(brainScore: number, physicalScore: number): number {
  const brain = normalizeEnergyScore(brainScore);
  const physical = normalizeEnergyScore(physicalScore);
  return normalizeEnergyScore((brain + physical) / 2);
}
