export const ENERGY_QUICK_LEVELS = [20, 40, 60, 80, 100] as const;
export type EnergyQuickLevel = (typeof ENERGY_QUICK_LEVELS)[number];
export type EnergyScoreMode = 'quick' | 'detailed' | 'percent';
export type EnergyRecordSubtype = 'snapshot' | 'change' | 'recovery' | 'depletion' | 'stop';
export type EnergyCaptureMode = 'realtime' | 'retrospective';
export type EnergyTimePrecision = 'exact' | 'approximate' | 'period' | 'day';
export type EnergyPeriod = '上午' | '下午' | '晚上' | '夜间' | string;
export type EnergyAggregateMethod = 'arithmetic-mean-v1';

export interface EnergySettings {
  /** direct capture 没有当前 Goal 上下文时使用。完整目标路径既是身份也是显示值。 */
  defaultGoalPath?: string;
}

export const DEFAULT_ENERGY_SETTINGS: EnergySettings = {
  defaultGoalPath: '',
};

export type EnergyProtocolMode = 'quick' | 'detailed';

export type EnergyProtocolPayload =
  | { version: 1; mode: 'quick'; score: EnergyQuickLevel }
  | { version: 1; mode: 'detailed'; brainScore: number; physicalScore: number };

export interface EnergySnapshotBaseInput {
  goalPath?: string;
  date: string;
  time?: string;
  period?: EnergyPeriod;
  captureMode?: EnergyCaptureMode;
  timePrecision?: EnergyTimePrecision;
  recordedAt?: string;
  source?: string;
}

/** 快捷记录：UI 只提供 20/40/60/80/100；score 保持 number 以兼容 1.0.12 已写入的数据。 */
export interface EnergyQuickSnapshotInput extends EnergySnapshotBaseInput {
  score: number;
  scoreMode?: 'quick' | 'percent';
  brainScore?: never;
  physicalScore?: never;
}

/** 详细记录：脑力/体力各自保留 0-100 原始值，总精力由领域层派生。 */
export interface EnergyDetailedSnapshotInput extends EnergySnapshotBaseInput {
  scoreMode: 'detailed';
  brainScore: number;
  physicalScore: number;
  score?: never;
}

export type EnergySnapshotInput = EnergyQuickSnapshotInput | EnergyDetailedSnapshotInput;

export interface EnergySnapshotRecord extends EnergySnapshotBaseInput {
  recordId: string;
  recordType: 'energy';
  subtype: 'snapshot';
  score: number;
  scoreMode: EnergyScoreMode;
  captureMode: EnergyCaptureMode;
  timePrecision: EnergyTimePrecision;
  quickLevel: EnergyQuickLevel;
  brainScore?: number;
  physicalScore?: number;
  aggregateMethod?: EnergyAggregateMethod;
}
