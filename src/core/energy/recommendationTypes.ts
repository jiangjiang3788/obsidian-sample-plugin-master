export type EnergyRecommendationBand = 'recover' | 'steady' | 'use-capacity';
export type EnergyActionSource = 'task' | 'plan' | 'habit' | 'activity' | 'manual';
export type EnergyActionLoad = 'low' | 'medium' | 'high';
export type EnergyRecommendationEvidence = 'personal' | 'metadata' | 'fallback';


export interface EnergyActionPolicyContext {
  /** Completed/recorded task minutes for the current day across goals. */
  dailyTaskMinutes: number;
  /** True only when observed load or personal stop guardrails justify preserving capacity. */
  preserveCapacityRisk: boolean;
  preserveCapacityReason?: string;
}

export interface EnergyActionHistoricalEffect {
  /** Observed before/after delta from the user's own history. Positive means recovery-like. */
  meanDelta: number;
  sampleCount: number;
  meanBrainDelta?: number;
  meanPhysicalDelta?: number;
  typicalDurationMinutes?: number;
  origin?: 'recommendation-feedback' | 'activity-history';
}

/**
 * A candidate is deliberately storage-agnostic. App/features may adapt Task / Plan / Habit
 * records into this shape, while core recommendation code stays independent from DataStore.
 */
export interface EnergyActionCandidate {
  id: string;
  title: string;
  source: EnergyActionSource;
  goalId?: string;
  goalPath?: string;
  seriesId?: string;
  theme?: string;
  /** Stable activity class used only for personal evidence matching. */
  activityLabel?: string;
  /** Optional expected duration. */
  durationMinutes?: number;
  /** Optional demand metadata; omitted values are treated as unknown, never invented. */
  brainLoad?: EnergyActionLoad;
  physicalLoad?: EnergyActionLoad;
  /** 0-100 importance/value supplied by the caller (priority/deadline adapter). */
  valueScore?: number;
  /** Explicit recovery intent, e.g. a recovery Plan/Habit; not inferred from title in core. */
  recoveryIntent?: boolean;
  historicalEffect?: EnergyActionHistoricalEffect;
}

export interface EnergyRecommendationContext {
  score: number;
  brainScore?: number;
  physicalScore?: number;
  lowThreshold?: number;
  highThreshold?: number;
  maximumRecommendations?: number;
  actionPolicy?: EnergyActionPolicyContext;
}

export interface EnergyRecommendedAction {
  candidate: EnergyActionCandidate;
  band: EnergyRecommendationBand;
  fitScore: number;
  evidence: EnergyRecommendationEvidence;
  reason: string;
  suggestedDurationMinutes: number;
  preserveCapacity: boolean;
  stopReason?: string;
}

export interface EnergyRecommendationResult {
  band: EnergyRecommendationBand;
  stateLabel: string;
  recommendations: EnergyRecommendedAction[];
  consideredCount: number;
}
