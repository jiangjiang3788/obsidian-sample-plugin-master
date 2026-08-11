export interface EnergyExperimentConfig {
  name: string;
  hypothesis?: string;
  interventionDate: string;
  windowDays?: number;
}

export interface EnergyExperimentPeriodSummary {
  label: 'baseline' | 'intervention';
  startDate: string;
  endDate: string;
  windowDays: number;
  sampleCount: number;
  sampledDays: number;
  missingDays: number;
  meanScore?: number;
  medianScore?: number;
  meanBrainScore?: number;
  meanPhysicalScore?: number;
  detailedSamples: number;
}

export type EnergyExperimentReadiness = 'not-configured' | 'collecting' | 'ready';
export type EnergyExperimentTrend = 'up' | 'down' | 'stable' | 'insufficient';

export interface EnergyExperimentComparison {
  name: string;
  hypothesis?: string;
  interventionDate: string;
  windowDays: number;
  baseline: EnergyExperimentPeriodSummary;
  intervention: EnergyExperimentPeriodSummary;
  deltaMeanScore?: number;
  deltaMeanBrainScore?: number;
  deltaMeanPhysicalScore?: number;
  readiness: EnergyExperimentReadiness;
  trend: EnergyExperimentTrend;
  message: string;
  disclaimer: string;
}
