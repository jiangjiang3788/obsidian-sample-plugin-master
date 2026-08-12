import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { EnergyEffectEvidence } from './effects';
import type { EnergyPatternEvidence } from './patternTypes';

export type EnergyManagementState = 'low' | 'guarded' | 'available' | 'high';
export type EnergyDimensionFocus = 'balanced' | 'brain-low' | 'physical-low';
export type EnergyManagementLevel = 'info' | 'caution';

export interface EnergyManagementLatestState {
  score: number;
  brainScore?: number;
  physicalScore?: number;
  date?: string;
  time?: string;
  state: EnergyManagementState;
  stateLabel: string;
  dimensionFocus: EnergyDimensionFocus;
  dimensionLabel?: string;
}

export interface EnergyManagementCandidate {
  key: string;
  label: string;
  sampleCount: number;
  meanDelta: number;
  medianDelta: number;
  meanBrainDelta?: number;
  meanPhysicalDelta?: number;
  evidence: EnergyEffectEvidence;
  reason: string;
}

export interface EnergyManagementGuardrail {
  key: 'preserve-capacity' | 'long-session';
  level: EnergyManagementLevel;
  title: string;
  detail: string;
  sampleCount: number;
  evidence: EnergyPatternEvidence;
}

export interface EnergyManagementReadiness {
  pairedActivityCount: number;
  recoveryCandidateCount: number;
  depletionCandidateCount: number;
  stopProxySampleCount: number;
  sufficientForPersonalSuggestions: boolean;
  message: string;
}

export interface EnergyManagementModel {
  latest: EnergyManagementLatestState;
  headline: string;
  guidance: string;
  recoveryCandidates: EnergyManagementCandidate[];
  cautionCandidates: EnergyManagementCandidate[];
  guardrails: EnergyManagementGuardrail[];
  readiness: EnergyManagementReadiness;
  disclaimer: string;
}

export interface BuildEnergyManagementOptions {
  analysisWindowDays?: number;
  maximumCandidates?: number;
  minimumPersonalSamples?: number;
  highEnergyThreshold?: number;
  dimensionGapThreshold?: number;
  /** Internal TaskSession + linked Energy records used for historical evidence. */
  evidenceRecords?: RecordViewItem[];
}
