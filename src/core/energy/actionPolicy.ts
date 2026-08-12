import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { EnergyManagementModel } from './managementTypes';
import type { EnergyActionCandidate, EnergyActionPolicyContext, EnergyRecommendationBand } from './recommendationTypes';
import { asTaskSessionRecord } from '../records/task/taskSession';

export interface EnergyActionTimingDecision {
  minutes: number;
  preserveCapacity: boolean;
  stopReason?: string;
}

function localSessionDay(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function recordedTaskMinutes(records: RecordViewItem[], today: string): number {
  return records.reduce((sum, record) => {
    const session = asTaskSessionRecord(record);
    if (!session || localSessionDay(session.sessionStartedAt) !== today) return sum;
    const duration = Number(session.sessionDurationMinutes);
    if (!Number.isFinite(duration) || duration <= 0) return sum;
    return sum + Math.min(720, Math.max(0, duration));
  }, 0);
}

/**
 * Build a conservative load context from recorded facts only. No synthetic battery score is created.
 */
export function buildEnergyActionPolicyContext(
  items: RecordViewItem[],
  management: EnergyManagementModel | null | undefined,
  today: string,
): EnergyActionPolicyContext {
  const dailyTaskMinutes = Math.round(recordedTaskMinutes(items, today));
  const preserveGuardrail = management?.guardrails?.find((row) => row.key === 'preserve-capacity' || row.key === 'long-session');
  const loadRisk = dailyTaskMinutes >= 180;
  const preserveCapacityRisk = loadRisk || Boolean(preserveGuardrail);
  let preserveCapacityReason: string | undefined;

  if (dailyTaskMinutes >= 300) {
    preserveCapacityReason = `\u4eca\u5929\u5df2\u8bb0\u5f55\u4efb\u52a1\u7ea6 ${dailyTaskMinutes}min\uff0c\u5efa\u8bae\u7528\u66f4\u77ed\u5de5\u4f5c\u5757\u5e76\u5230\u70b9\u6536\u5c3e\u3002`;
  } else if (loadRisk) {
    preserveCapacityReason = `\u4eca\u5929\u5df2\u8bb0\u5f55\u4efb\u52a1\u7ea6 ${dailyTaskMinutes}min\uff0c\u8fd9\u4e00\u5757\u5148\u8bbe\u660e\u786e\u505c\u6b62\u70b9\uff0c\u7ed9\u540e\u7eed\u7559\u4f59\u91cf\u3002`;
  } else if (preserveGuardrail) {
    preserveCapacityReason = '\u4f60\u7684\u5386\u53f2\u91cc\u5df2\u51fa\u73b0\u9ad8\u80fd\u540e\u6301\u7eed\u8fc7\u4e45\u7684\u8ff9\u8c61\uff0c\u8fd9\u4e00\u5757\u5148\u8bbe\u660e\u786e\u505c\u6b62\u70b9\u3002';
  }

  return { dailyTaskMinutes, preserveCapacityRisk, preserveCapacityReason };
}

function baseCap(band: EnergyRecommendationBand): number {
  if (band === 'recover') return 30;
  if (band === 'steady') return 45;
  return 60;
}

/**
 * Resolve an actionable work-block length. The result is a stop point, not a prediction of remaining energy.
 */
export function resolveEnergyActionTiming(
  candidate: EnergyActionCandidate,
  band: EnergyRecommendationBand,
  policy?: EnergyActionPolicyContext,
): EnergyActionTimingDecision {
  const requested = candidate.durationMinutes && candidate.durationMinutes > 0 ? candidate.durationMinutes : undefined;
  let cap = baseCap(band);
  const personalDepletion = Boolean(
    candidate.historicalEffect
    && candidate.historicalEffect.sampleCount >= 3
    && candidate.historicalEffect.meanDelta <= -8,
  );

  if (personalDepletion) cap = Math.min(cap, 45);
  if (policy?.preserveCapacityRisk && band !== 'recover') cap = Math.min(cap, 45);
  if ((policy?.dailyTaskMinutes || 0) >= 300 && band !== 'recover') cap = Math.min(cap, 30);
  if (personalDepletion && (policy?.dailyTaskMinutes || 0) >= 180 && band !== 'recover') cap = Math.min(cap, 30);

  const minutes = Math.max(10, Math.round(Math.min(requested ?? cap, cap)));
  const preserveCapacity = band !== 'recover' && Boolean(policy?.preserveCapacityRisk);
  return {
    minutes,
    preserveCapacity,
    stopReason: preserveCapacity ? policy?.preserveCapacityReason : undefined,
  };
}
