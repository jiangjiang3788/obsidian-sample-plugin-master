import type { Item } from '../types/schema';

export type EnergyPatternEvidence = 'insufficient' | 'exploratory' | 'supported';
export type EnergyPatternTrend = 'up' | 'down' | 'stable' | 'mixed' | 'insufficient';

export interface EnergyDaypartPattern {
  key: string;
  label: string;
  startHour: number;
  endHour: number;
  sampleCount: number;
  meanScore?: number;
  medianScore?: number;
  meanBrainScore?: number;
  meanPhysicalScore?: number;
  evidence: EnergyPatternEvidence;
}

export interface EnergyLagPattern {
  key: '6h' | '12h' | '24h';
  label: string;
  lagHours: number;
  toleranceMinutes: number;
  sampleCount: number;
  meanDelta?: number;
  medianDelta?: number;
  meanBrainDelta?: number;
  meanPhysicalDelta?: number;
  trend: EnergyPatternTrend;
  evidence: EnergyPatternEvidence;
}

export interface EnergyContinuousWorkPattern {
  key: string;
  label: string;
  minMinutes: number;
  maxMinutes?: number;
  sessionCount: number;
  pairedSessionCount: number;
  meanDelta?: number;
  medianDelta?: number;
  meanBrainDelta?: number;
  meanPhysicalDelta?: number;
  trend: EnergyPatternTrend;
  evidence: EnergyPatternEvidence;
}

export interface EnergyHighStateContinuationSample {
  energyItemId: string;
  date: string;
  time: string;
  score: number;
  sessionDurationMinutes: number;
  stopLatencyMinutes: number;
  sessionStartTime: string;
  sessionEndTime: string;
  crossesMidnight: boolean;
  lateNight: boolean;
}

export interface EnergyStopProxyPattern {
  highEnergySampleCount: number;
  followedByWorkCount: number;
  longContinuationCount: number;
  lateNightCount: number;
  meanSessionDurationMinutes?: number;
  meanStopLatencyMinutes?: number;
  longContinuationRatio?: number;
  lateNightRatio?: number;
  evidence: EnergyPatternEvidence;
  recentSamples: EnergyHighStateContinuationSample[];
}

export interface EnergyPatternAnalytics {
  analysisWindowDays: number;
  startDate: string;
  endDate: string;
  energySampleCount: number;
  dayparts: EnergyDaypartPattern[];
  lag: EnergyLagPattern[];
  continuousWork: EnergyContinuousWorkPattern[];
  continuousSessionCount: number;
  pairedContinuousSessionCount: number;
  stopProxy: EnergyStopProxyPattern;
}

export interface BuildEnergyPatternsOptions {
  analysisWindowDays?: number;
  sessionGapMinutes?: number;
  beforeSessionWindowMinutes?: number;
  afterSessionWindowMinutes?: number;
  highEnergyThreshold?: number;
  highEnergyWorkStartWindowMinutes?: number;
  longContinuationMinutes?: number;
  lateNightHour?: number;
}

export interface EnergyPatternPoint {
  itemId: string;
  date: string;
  time: string;
  absoluteMinute: number;
  minuteOfDay: number;
  score: number;
  brainScore?: number;
  physicalScore?: number;
  item: Item;
}

export interface EnergyPatternActivityInterval {
  item: Item;
  startAbsolute: number;
  endAbsolute: number;
  durationMinutes: number;
}

export interface EnergyPatternWorkSession {
  startAbsolute: number;
  endAbsolute: number;
  durationMinutes: number;
  items: Item[];
}
