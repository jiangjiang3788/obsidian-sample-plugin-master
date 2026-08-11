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

const DEFAULT_LOW_THRESHOLD = 40;
const DEFAULT_HIGH_THRESHOLD = 60;
const DEFAULT_MAXIMUM = 3;
const PERSONAL_SAMPLE_MINIMUM = 3;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function bandFor(score: number, lowThreshold: number, highThreshold: number): EnergyRecommendationBand {
  if (score <= lowThreshold) return 'recover';
  if (score > highThreshold) return 'use-capacity';
  return 'steady';
}

function stateLabel(band: EnergyRecommendationBand): string {
  if (band === 'recover') return '低精力';
  if (band === 'use-capacity') return '精力可用';
  return '中间状态';
}

function loadValue(load?: EnergyActionLoad): number | undefined {
  if (load === 'low') return 25;
  if (load === 'medium') return 55;
  if (load === 'high') return 80;
  return undefined;
}

function demandFit(available: number, load?: EnergyActionLoad): number {
  const demand = loadValue(load);
  if (demand == null) return 0;

  // Match the task load to the energy that is actually available, rather than only
  // asking whether the user can technically "afford" the task. This makes low,
  // medium, and high load tasks separate visibly across low/mid/high Energy states.
  const gap = available - demand;
  let fit = 14 - Math.abs(gap) * 0.35;
  if (gap < -5) fit -= Math.min(18, Math.abs(gap) * 0.4);
  return Math.max(-24, Math.min(14, Math.round(fit * 10) / 10));
}

function effectEvidence(effect?: EnergyActionHistoricalEffect): EnergyRecommendationEvidence {
  return effect && effect.sampleCount >= PERSONAL_SAMPLE_MINIMUM ? 'personal' : 'metadata';
}

function historicalFit(effect: EnergyActionHistoricalEffect | undefined, band: EnergyRecommendationBand): number {
  if (!effect || effect.sampleCount < PERSONAL_SAMPLE_MINIMUM) return 0;
  const delta = Math.max(-40, Math.min(40, effect.meanDelta));
  if (band === 'recover') return delta * 1.25;
  if (band === 'use-capacity') {
    // High energy is for useful work, but repeated heavy depletion still needs a penalty.
    return delta >= 0 ? Math.min(8, delta * 0.2) : delta * 0.45;
  }
  return delta * 0.6;
}

function durationFit(duration: number | undefined, band: EnergyRecommendationBand): number {
  if (duration == null || duration <= 0) return 0;
  if (band === 'recover') {
    if (duration <= 30) return 10;
    if (duration <= 45) return 3;
    if (duration <= 60) return -6;
    return -16;
  }
  if (band === 'use-capacity') {
    // High energy should favor a meaningful work block, not automatically prefer every tiny chore.
    if (duration <= 20) return 1;
    if (duration <= 45) return 4;
    if (duration <= 90) return 8;
    if (duration <= 120) return 2;
    return -8;
  }
  if (duration <= 45) return 6;
  if (duration <= 75) return 1;
  return -6;
}

function candidateScore(candidate: EnergyActionCandidate, context: Required<Pick<EnergyRecommendationContext, 'score'>> & EnergyRecommendationContext, band: EnergyRecommendationBand): number {
  const overall = clampScore(context.score);
  const brain = context.brainScore == null ? overall : clampScore(context.brainScore);
  const physical = context.physicalScore == null ? overall : clampScore(context.physicalScore);
  const value = candidate.valueScore == null ? 50 : clampScore(candidate.valueScore);
  let score = 50;

  score += demandFit(brain, candidate.brainLoad);
  score += demandFit(physical, candidate.physicalLoad);
  score += durationFit(candidate.durationMinutes, band);
  score += historicalFit(candidate.historicalEffect, band);

  if (band === 'recover') {
    if (candidate.recoveryIntent) score += 28;
    if (candidate.brainLoad === 'high') score -= 16;
    if (candidate.physicalLoad === 'high' && physical <= 40) score -= 16;
    score += (value - 50) * 0.08;
  } else if (band === 'use-capacity') {
    if (candidate.recoveryIntent) score -= 20;
    score += (value - 50) * 0.8;
  } else {
    if (candidate.recoveryIntent) score += 8;
    score += (value - 50) * 0.18;
  }

  return Math.round(score * 10) / 10;
}

function signed(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

function reasonFor(candidate: EnergyActionCandidate, band: EnergyRecommendationBand, duration: number): string {
  const effect = candidate.historicalEffect;
  const personal = effect && effect.sampleCount >= PERSONAL_SAMPLE_MINIMUM;
  const historyPrefix = effect?.origin === 'recommendation-feedback' ? '你的推荐执行反馈里' : '你的历史里';
  if (band === 'recover') {
    if (personal && effect.meanDelta > 0) return `${historyPrefix}这类活动平均 ${signed(effect.meanDelta)}（N=${effect.sampleCount}），先做 ${duration}min。`;
    if (candidate.recoveryIntent) return `当前精力偏低，先做低负荷恢复项 ${duration}min。`;
    return `当前精力偏低，这项负荷相对可控，先做 ${duration}min。`;
  }
  if (band === 'use-capacity') {
    if (personal && effect.meanDelta <= -8) return `当前能做，但${historyPrefix}这类活动平均 ${signed(effect.meanDelta)}（N=${effect.sampleCount}），先限时 ${duration}min。`;
    return `当前精力可用，适合推进这项高价值事项，先做 ${duration}min。`;
  }
  if (personal) return `当前处于中间状态；${historyPrefix}变化 ${signed(effect.meanDelta)}（N=${effect.sampleCount}），先做 ${duration}min。`;
  return `当前适合中等负荷，先做 ${duration}min 再看状态。`;
}

/**
 * Pure recommendation ranker. It accepts already-resolved candidates and never queries DataStore,
 * parses Plan/Task Markdown, or renders UI. Those responsibilities belong to adapters/features.
 */
export function buildEnergyActionRecommendations(
  context: EnergyRecommendationContext,
  candidates: EnergyActionCandidate[],
): EnergyRecommendationResult {
  const lowThreshold = Math.max(0, Math.min(80, Math.round(context.lowThreshold ?? DEFAULT_LOW_THRESHOLD)));
  const highThreshold = Math.max(lowThreshold + 1, Math.min(100, Math.round(context.highThreshold ?? DEFAULT_HIGH_THRESHOLD)));
  const maximum = Math.max(1, Math.min(500, Math.floor(context.maximumRecommendations ?? DEFAULT_MAXIMUM)));
  const score = clampScore(context.score);
  const band = bandFor(score, lowThreshold, highThreshold);
  const normalizedContext = { ...context, score };

  const recommendations: EnergyRecommendedAction[] = candidates
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
      };
    })
    .sort((left, right) => right.fitScore - left.fitScore || left.candidate.title.localeCompare(right.candidate.title, 'zh-CN'))
    .slice(0, maximum);

  return {
    band,
    stateLabel: stateLabel(band),
    recommendations,
    consideredCount: candidates.length,
  };
}
