export const ENERGY_QUICK_LEVELS = [20, 40, 60, 80, 100] as const;
export type EnergyQuickLevel = (typeof ENERGY_QUICK_LEVELS)[number];
export type EnergyScoreMode = 'quick' | 'detailed' | 'percent';
export type EnergyRecordSubtype = 'snapshot' | 'change' | 'recovery' | 'depletion' | 'stop';
export type EnergyCaptureMode = 'realtime' | 'retrospective';
export type EnergyTimePrecision = 'exact' | 'approximate' | 'period' | 'day';
export type EnergyPeriod = '上午' | '下午' | '晚上' | '夜间' | string;
export type EnergyAggregateMethod = 'arithmetic-mean-v1';

export interface EnergySettings {
  /** direct capture 没有当前 Goal 上下文时使用。空值表示自动回退到第一个活跃目标。 */
  defaultGoalId?: string;
  /** Energy 快捷记录没有显式主题上下文时使用。主题只作为记录元数据，不参与模板解析。 */
  defaultThemePath?: string;
}

export const DEFAULT_ENERGY_SETTINGS: EnergySettings = {
  defaultGoalId: '',
  defaultThemePath: '',
};

export type EnergyProtocolMode = 'quick' | 'detailed';

export type EnergyProtocolPayload =
  | { version: 1; mode: 'quick'; score: EnergyQuickLevel }
  | { version: 1; mode: 'detailed'; brainScore: number; physicalScore: number };

export interface EnergySnapshotBaseInput {
  goalId?: string;
  goalPath?: string;
  themePath?: string;
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
  coreBlock: 'energy';
  subtype: 'snapshot';
  categoryKey: '精力';
  score: number;
  scoreMode: EnergyScoreMode;
  captureMode: EnergyCaptureMode;
  timePrecision: EnergyTimePrecision;
  quickLevel: EnergyQuickLevel;
  brainScore?: number;
  physicalScore?: number;
  aggregateMethod?: EnergyAggregateMethod;
}
