import type {
  EnergyActionCandidate,
  EnergyActionHistoricalEffect,
  EnergyActionLoad,
  EnergyRecommendationBand,
  EnergyRecommendationContext,
  EnergyRecommendationEvidence,
  EnergyRecommendationResult,
  EnergyRecommendedAction,
} from './recommendationTypes';
import { resolveEnergyActionTiming } from './actionPolicy';

export const ENERGY_RECOMMENDATION_LOW_THRESHOLD = 40;
export const ENERGY_RECOMMENDATION_HIGH_THRESHOLD = 80;
const DEFAULT_MAXIMUM = 3;
const PERSONAL_SAMPLE_MINIMUM = 3;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function bandFor(score: number, lowThreshold: number, highThreshold: number): EnergyRecommendationBand {
  if (score <= lowThreshold) return 'recover';
  if (score >= highThreshold) return 'use-capacity';
  return 'steady';
}

function stateLabel(band: EnergyRecommendationBand): string {
  if (band === 'recover') return '低精力';
  if (band === 'use-capacity') return '高精力';
  return '可用精力';
}

function loadValue(load?: EnergyActionLoad): number | undefined {
  if (load === 'low') return 25;
  if (load === 'medium') return 55;
  if (load === 'high') return 85;
  return undefined;
}

function demandFit(available: number, load?: EnergyActionLoad): number {
  const demand = loadValue(load);
  if (demand == null) return 0;
  const gap = available - demand;
  let fit = 16 - Math.abs(gap) * 0.38;
  if (gap < -5) fit -= Math.min(24, Math.abs(gap) * 0.55);
  return Math.max(-30, Math.min(16, Math.round(fit * 10) / 10));
}

function effectEvidence(effect?: EnergyActionHistoricalEffect): EnergyRecommendationEvidence {
  return effect && effect.sampleCount >= PERSONAL_SAMPLE_MINIMUM ? 'personal' : 'metadata';
}

function historicalFit(effect: EnergyActionHistoricalEffect | undefined, band: EnergyRecommendationBand): number {
  if (!effect || effect.sampleCount < PERSONAL_SAMPLE_MINIMUM) return 0;
  const delta = Math.max(-40, Math.min(40, effect.meanDelta));
  if (band === 'recover') return delta * 1.25;
  if (band === 'use-capacity') return delta >= 0 ? Math.min(6, delta * 0.15) : delta * 0.38;
  return delta * 0.55;
}

function durationFit(duration: number | undefined, band: EnergyRecommendationBand): number {
  if (duration == null || duration <= 0) return 0;
  if (band === 'recover') {
    if (duration <= 5) return 8;
    if (duration <= 20) return 10;
    if (duration <= 35) return 6;
    if (duration <= 60) return -4;
    return -14;
  }
  if (band === 'use-capacity') {
    if (duration <= 5) return -5;
    if (duration <= 20) return 0;
    if (duration <= 60) return 8;
    if (duration <= 120) return 10;
    return 2;
  }
  if (duration <= 5) return 1;
  if (duration <= 45) return 6;
  if (duration <= 75) return 2;
  return -5;
}

function energyOpportunityFit(candidate: EnergyActionCandidate, brain: number, physical: number, band: EnergyRecommendationBand): number {
  const brainFit = demandFit(brain, candidate.brainLoad);
  const physicalFit = demandFit(physical, candidate.physicalLoad);
  let score = brainFit + physicalFit;

  if (band === 'use-capacity') {
    if (candidate.brainLoad === 'high' && brain >= 80) score += 12;
    if (candidate.physicalLoad === 'high' && physical >= 80) score += 8;
    if (!candidate.brainLoad && !candidate.physicalLoad) score -= 3;
    if (candidate.brainLoad === 'low' && candidate.physicalLoad !== 'high') score -= 6;
  } else if (band === 'recover') {
    if (candidate.brainLoad === 'high') score -= 18;
    if (candidate.physicalLoad === 'high' && physical <= 45) score -= 18;
    if (candidate.brainLoad === 'low') score += 5;
    if (candidate.physicalLoad === 'low') score += 3;
  }
  return score;
}

function valueFit(value: number, band: EnergyRecommendationBand): number {
  if (band === 'use-capacity') return (value - 50) * 0.9;
  if (band === 'steady') return (value - 50) * 0.3;
  return (value - 50) * 0.1;
}

function opportunityCostPenalty(candidate: EnergyActionCandidate, value: number, band: EnergyRecommendationBand): number {
  if (band !== 'use-capacity') return 0;
  const duration = candidate.durationMinutes;
  const micro = duration != null && duration <= 5;
  const lowDemand = candidate.brainLoad === 'low' && candidate.physicalLoad !== 'high';
  if (candidate.recoveryIntent) return -18;
  if (micro && value < 75) return -12;
  if (lowDemand && value < 70) return -8;
  return 0;
}

function candidateScore(
  candidate: EnergyActionCandidate,
  context: Required<Pick<EnergyRecommendationContext, 'score'>> & EnergyRecommendationContext,
  band: EnergyRecommendationBand,
): number {
  const overall = clampScore(context.score);
  const brain = context.brainScore == null ? overall : clampScore(context.brainScore);
  const physical = context.physicalScore == null ? overall : clampScore(context.physicalScore);
  const value = candidate.valueScore == null ? 50 : clampScore(candidate.valueScore);
  let score = 50;

  // Decision order after hard availability filtering:
  // value/urgency -> energy opportunity -> duration -> personal history.
  score += valueFit(value, band);
  score += energyOpportunityFit(candidate, brain, physical, band);
  score += durationFit(candidate.durationMinutes, band);
  score += historicalFit(candidate.historicalEffect, band);
  score += opportunityCostPenalty(candidate, value, band);

  if (band === 'recover' && candidate.recoveryIntent) score += 30;
  if (band === 'steady' && candidate.recoveryIntent) score += 5;

  return Math.round(score * 10) / 10;
}

function signed(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

function loadLabel(load?: EnergyActionLoad): string {
  if (load === 'high') return '高';
  if (load === 'medium') return '中';
  if (load === 'low') return '低';
  return '';
}

function reasonFor(candidate: EnergyActionCandidate, band: EnergyRecommendationBand, duration: number): string {
  const parts: string[] = [];
  if (band === 'use-capacity') parts.push('当前高精力窗口');
  else if (band === 'recover') parts.push('当前低精力窗口');
  else parts.push('当前精力可用');

  if (candidate.valueScore != null && candidate.valueScore >= 75) parts.push('高价值/紧急');
  if (candidate.brainLoad) parts.push(`${loadLabel(candidate.brainLoad)}脑力`);
  if (candidate.physicalLoad) parts.push(`${loadLabel(candidate.physicalLoad)}体力`);
  if (candidate.recoveryIntent) parts.push('恢复项');
  parts.push(`建议 ${duration}min`);

  const effect = candidate.historicalEffect;
  if (effect && effect.sampleCount >= PERSONAL_SAMPLE_MINIMUM) {
    parts.push(`个人历史 ${signed(effect.meanDelta)} · N=${effect.sampleCount}`);
  }
  return parts.join(' · ');
}

/**
 * Energy Recommendation V2 ranker.
 * Availability has already removed tasks that cannot be done in the current context.
 * This layer therefore decides which eligible task deserves the current energy window.
 */
export function buildEnergyActionRecommendations(
  context: EnergyRecommendationContext,
  candidates: EnergyActionCandidate[],
): EnergyRecommendationResult {
  const lowThreshold = Math.max(0, Math.min(80, Math.round(context.lowThreshold ?? ENERGY_RECOMMENDATION_LOW_THRESHOLD)));
  const highThreshold = Math.max(lowThreshold + 1, Math.min(100, Math.round(context.highThreshold ?? ENERGY_RECOMMENDATION_HIGH_THRESHOLD)));
  const maximum = Math.max(1, Math.min(500, Math.floor(context.maximumRecommendations ?? DEFAULT_MAXIMUM)));
  const score = clampScore(context.score);
  const band = bandFor(score, lowThreshold, highThreshold);
  const normalizedContext = { ...context, score };

  const ranked = candidates
    .filter((candidate) => !!candidate.id && !!candidate.title.trim())
    .map((candidate) => {
      const timing = resolveEnergyActionTiming(candidate, band, context.actionPolicy);
      const duration = timing.minutes;
      return {
        candidate,
        band,
        fitScore: candidateScore(candidate, normalizedContext, band),
        evidence: effectEvidence(candidate.historicalEffect),
        reason: reasonFor(candidate, band, duration),
        suggestedDurationMinutes: duration,
        preserveCapacity: timing.preserveCapacity,
        stopReason: timing.stopReason,
      } satisfies EnergyRecommendedAction;
    })
    .sort((left, right) => right.fitScore - left.fitScore || (right.candidate.valueScore || 0) - (left.candidate.valueScore || 0) || left.candidate.title.localeCompare(right.candidate.title, 'zh-CN'))
    .slice(0, maximum)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return {
    band,
    stateLabel: stateLabel(band),
    recommendations: ranked,
    consideredCount: candidates.length,
  };
}
