import type { EnergyViewConfig } from '../types';

export const ENERGY_VIEW_DEFAULT_CONFIG: EnergyViewConfig = {
  windowDays: 7,
  recentSampleLimit: 5,
  maxGoals: 3,
  goalPath: '',
  showTimeline: true,
  showContext: true,
  showEffects: true,
  analysisWindowDays: 30,
  showPatterns: true,
  showManagement: true,
  showWeeklyReview: true,
  showExperiment: true,
  experimentName: '',
  experimentHypothesis: '',
  experimentInterventionDate: '',
  experimentWindowDays: 7,
};
