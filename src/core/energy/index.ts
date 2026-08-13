export type {
  EnergyAggregateMethod,
  EnergyCaptureMode,
  EnergyDetailedSnapshotInput,
  EnergyPeriod,
  EnergyQuickLevel,
  EnergyQuickSnapshotInput,
  EnergyRecordSubtype,
  EnergyScoreMode,
  EnergySnapshotBaseInput,
  EnergySnapshotInput,
  EnergySnapshotRecord,
  EnergyTimePrecision,
  EnergySettings,
  EnergyProtocolMode,
  EnergyProtocolPayload,
} from './types';
export { ENERGY_QUICK_LEVELS, DEFAULT_ENERGY_SETTINGS } from './types';
export {
  ENERGY_QUICK_LEVEL_LABELS,
  calculateDetailedEnergyScore,
  isEnergyQuickLevel,
  normalizeEnergyScore,
  toEnergyQuickLevel,
} from './scale';
export {
  ENERGY_APPEND_UNDER_HEADER,
  ENERGY_TARGET_FILE,
  buildEnergySnapshotMarkdown,
  buildEnergySnapshotRecord,
} from './record';

export {
  ENERGY_PROTOCOL_ACTION,
  ENERGY_PROTOCOL_VERSION,
  parseEnergyProtocolParams,
  resolveEnergyCaptureGoal,
} from './protocol';
export type { EnergyProtocolParseResult, EnergyCaptureGoal } from './protocol';

export { isEnergyItem, readEnergyItemSnapshot, energySnapshotOccurrenceKey } from './item';
export type { EnergyItemLike, EnergyItemSnapshot } from './item';
export { buildEnergyActionRecommendations, ENERGY_RECOMMENDATION_LOW_THRESHOLD, ENERGY_RECOMMENDATION_HIGH_THRESHOLD } from './recommendation';
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

export { buildEnergyActionCandidates, attachEnergyRecommendationEvidence } from './recommendationCandidates';

export { buildEnergyRecommendationLearning, attachEnergyRecommendationLearning, buildEnergyRecoveryActionCandidates } from './recommendationLearning';
export type { EnergyRecommendationLearningModel, EnergyRecoveryLibraryEntry, EnergyLearningOrigin } from './recommendationLearning';

export { buildEnergyDataQuality } from './quality';
export type { BuildEnergyDataQualityOptions, EnergyDataQualityLevel, EnergyDataQualityModel } from './quality';
