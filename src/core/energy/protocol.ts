import { isEnergyQuickLevel, normalizeEnergyScore } from './scale';
import type { EnergyProtocolPayload } from './types';

export const ENERGY_PROTOCOL_ACTION = 'thinkos-energy';
export const ENERGY_PROTOCOL_VERSION = 1 as const;

export interface EnergyCaptureGoal {
  id: string;
  title: string;
  goalPath?: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  themePath?: string | null;
}

export type EnergyProtocolParseResult =
  | { ok: true; payload: EnergyProtocolPayload }
  | { ok: false; message: string };

function readInteger(raw: unknown): number | null {
  const text = String(raw ?? '').trim();
  if (!/^-?\d+$/.test(text)) return null;
  const value = Number(text);
  return Number.isSafeInteger(value) ? value : null;
}

/**
 * Parse the public obsidian://thinkos-energy?v=1... contract.
 * The URI can only carry energy intent; it cannot choose files, goals, commands, or raw markdown.
 */
export function parseEnergyProtocolParams(params: Record<string, string>): EnergyProtocolParseResult {
  const version = readInteger(params.v);
  if (version !== ENERGY_PROTOCOL_VERSION) {
    return { ok: false, message: `不支持的精力快捷协议版本：${params.v || '缺失'}。` };
  }

  const mode = String(params.mode || '').trim();
  if (mode === 'quick') {
    const score = readInteger(params.energy);
    if (score == null || !isEnergyQuickLevel(score)) {
      return { ok: false, message: '快捷精力只接受 20 / 40 / 60 / 80 / 100。' };
    }
    return { ok: true, payload: { version: 1, mode: 'quick', score } };
  }

  if (mode === 'detailed') {
    const brainScore = readInteger(params.mental);
    const physicalScore = readInteger(params.physical);
    if (brainScore == null || brainScore < 0 || brainScore > 100) {
      return { ok: false, message: '详细精力的脑力必须是 0–100 的整数。' };
    }
    if (physicalScore == null || physicalScore < 0 || physicalScore > 100) {
      return { ok: false, message: '详细精力的体力必须是 0–100 的整数。' };
    }
    return {
      ok: true,
      payload: {
        version: 1,
        mode: 'detailed',
        brainScore: normalizeEnergyScore(brainScore),
        physicalScore: normalizeEnergyScore(physicalScore),
      },
    };
  }

  return { ok: false, message: '精力快捷协议 mode 只支持 quick 或 detailed。' };
}

/** Resolve the default Goal used by context-free captures such as iOS Shortcuts. */
export function resolveEnergyCaptureGoal(
  goals: EnergyCaptureGoal[],
  defaultGoalId?: string | null,
): EnergyCaptureGoal | null {
  const available = goals.filter((goal) => goal.status !== 'archived');
  const preferredId = String(defaultGoalId || '').trim();
  if (preferredId) {
    const preferred = available.find((goal) => goal.id === preferredId);
    if (preferred) return preferred;
  }
  return available.find((goal) => goal.status === 'active') || available[0] || null;
}
