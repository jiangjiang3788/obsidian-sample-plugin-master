export * from './index';

export { resolveEnergyContext } from './context';
export type {
  EnergyActivityContext,
  EnergyActivityRelation,
  EnergyContext,
  EnergyContextConfidence,
  EnergyDailySignalContext,
  EnergyDailySignalKind,
  ResolveEnergyContextOptions,
} from './context';

export { buildEnergyTimeline } from './timeline';
export type {
  BuildEnergyTimelineOptions,
  EnergyTimelineCoverage,
  EnergyTimelineDay,
  EnergyTimelineModel,
  EnergyTimelinePoint,
} from './timeline';

export { buildEnergyEffects, classifyEnergyActivity } from './effects';
export type {
  BuildEnergyEffectsOptions,
  EnergyActivityEffectSample,
  EnergyEffectAggregate,
  EnergyEffectAnalytics,
  EnergyEffectConfidence,
  EnergyEffectDimension,
  EnergyEffectEndpoint,
  EnergyEffectEvidence,
  EnergyEffectTrend,
} from './effects';

export { buildEnergyPatterns } from './patterns';
export type {
  BuildEnergyPatternsOptions,
  EnergyContinuousWorkPattern,
  EnergyDaypartPattern,
  EnergyHighStateContinuationSample,
  EnergyLagPattern,
  EnergyPatternAnalytics,
  EnergyPatternEvidence,
  EnergyPatternTrend,
  EnergyStopProxyPattern,
} from './patterns';

export { buildEnergyManagement } from './management';
export type {
  BuildEnergyManagementOptions,
  EnergyDimensionFocus,
  EnergyManagementCandidate,
  EnergyManagementGuardrail,
  EnergyManagementLatestState,
  EnergyManagementLevel,
  EnergyManagementModel,
  EnergyManagementReadiness,
  EnergyManagementState,
} from './managementTypes';

export { buildEnergyWeeklyReview } from './weekly';
export type {
  BuildEnergyWeeklyReviewOptions,
  EnergyWeeklyActivityFinding,
  EnergyWeeklyLongWorkFinding,
  EnergyWeeklyMetricSummary,
  EnergyWeeklyReview,
  EnergyWeeklyReviewReadiness,
} from './weeklyTypes';

export { buildEnergyExperimentComparison } from './experiment';
export type {
  EnergyExperimentComparison,
  EnergyExperimentConfig,
  EnergyExperimentPeriodSummary,
  EnergyExperimentReadiness,
  EnergyExperimentTrend,
} from './experimentTypes';

export { buildEnergyDataQuality } from './quality';
export type { BuildEnergyDataQualityOptions, EnergyDataQualityLevel, EnergyDataQualityModel } from './quality';

export { buildEnergyPeriod } from './period';
export type {
  BuildEnergyPeriodOptions,
  EnergyPeriodDay,
  EnergyPeriodMode,
  EnergyPeriodModel,
  EnergyPeriodSample,
} from './period';

export { buildEnergyActionRecommendations } from './recommendation';
export type {
  EnergyActionCandidate,
  EnergyActionHistoricalEffect,
  EnergyActionLoad,
  EnergyActionSource,
  EnergyRecommendationBand,
  EnergyRecommendationContext,
  EnergyRecommendationEvidence,
  EnergyRecommendationResult,
  EnergyRecommendedAction,
} from './recommendationTypes';

export { buildEnergyActionCandidates, buildEnergyActionCandidateResult, attachEnergyRecommendationEvidence } from './recommendationCandidates';
export type { EnergyActionCandidateBuildResult, EnergyCandidateDiagnostics, EnergyCandidateExclusionReason, BuildEnergyActionCandidatesOptions } from './recommendationCandidates';

export { buildEnergyActionPolicyContext, resolveEnergyActionTiming } from './actionPolicy';
export type { EnergyActionPolicyContext, EnergyActionTimingDecision } from './actionPolicy';
