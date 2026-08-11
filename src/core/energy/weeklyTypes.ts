import type { Item } from '../types/schema';
import type { EnergyEffectAggregate, EnergyEffectEvidence } from './effects';
import type { EnergyDaypartPattern, EnergyPatternEvidence, EnergyStopProxyPattern } from './patternTypes';
import type { EnergyTimelineCoverage } from './timeline';

export interface EnergyWeeklyMetricSummary {
  sampleCount: number;
  sampledDays: number;
  meanScore?: number;
  medianScore?: number;
  meanBrainScore?: number;
  meanPhysicalScore?: number;
  realtimeSamples: number;
  retrospectiveSamples: number;
  detailedSamples: number;
}

export interface EnergyWeeklyActivityFinding {
  key: string;
  label: string;
  sampleCount: number;
  meanDelta: number;
  medianDelta: number;
  meanBrainDelta?: number;
  meanPhysicalDelta?: number;
  evidence: EnergyEffectEvidence;
}

export interface EnergyWeeklyLongWorkFinding {
  label: string;
  sessionCount: number;
  pairedSessionCount: number;
  meanDelta?: number;
  medianDelta?: number;
  evidence: EnergyPatternEvidence;
}

export interface EnergyWeeklyReviewReadiness {
  sufficientCoverage: boolean;
  sufficientSamples: boolean;
  message: string;
}

export interface EnergyWeeklyReview {
  windowDays: number;
  startDate: string;
  endDate: string;
  coverage: EnergyTimelineCoverage;
  metrics: EnergyWeeklyMetricSummary;
  bestDaypart?: EnergyDaypartPattern;
  lowestDaypart?: EnergyDaypartPattern;
  topRecovery?: EnergyWeeklyActivityFinding;
  topDepletion?: EnergyWeeklyActivityFinding;
  longWork?: EnergyWeeklyLongWorkFinding;
  stopProxy?: EnergyStopProxyPattern;
  observations: string[];
  readiness: EnergyWeeklyReviewReadiness;
  disclaimer: string;
}

export interface BuildEnergyWeeklyReviewOptions {
  windowDays?: number;
  endDate?: string;
  /** Internal Record evidence (TaskSession + linked Energy snapshots). */
  evidenceRecords?: Item[];
}

export function weeklyFindingFromEffect(row: EnergyEffectAggregate): EnergyWeeklyActivityFinding {
  return {
    key: row.key,
    label: row.label,
    sampleCount: row.sampleCount,
    meanDelta: row.meanDelta,
    medianDelta: row.medianDelta,
    meanBrainDelta: row.meanBrainDelta,
    meanPhysicalDelta: row.meanPhysicalDelta,
    evidence: row.evidence,
  };
}
