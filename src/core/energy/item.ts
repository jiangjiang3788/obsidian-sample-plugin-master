import { isEnergyQuickLevel, toEnergyQuickLevel } from './scale';
import type { EnergyCaptureMode, EnergyQuickLevel, EnergyScoreMode, EnergyTimePrecision } from './types';

export interface EnergyItemLike {
  coreBlock?: string;
  categoryKey?: string;
  date?: string;
  startTime?: string;
  extra?: Record<string, string | number | boolean>;
}

export interface EnergyItemSnapshot {
  score: number;
  quickLevel: EnergyQuickLevel;
  brainScore?: number;
  physicalScore?: number;
  scoreMode?: EnergyScoreMode;
  captureMode?: EnergyCaptureMode;
  timePrecision?: EnergyTimePrecision;
  date?: string;
  time?: string;
  recordedAt?: string;
  source?: string;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value ?? '').trim();
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readText(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text || undefined;
}

function readScore(value: unknown): number | undefined {
  const parsed = readNumber(value);
  if (parsed == null || parsed < 0 || parsed > 100) return undefined;
  return Math.round(parsed);
}

export function isEnergyItem(item: EnergyItemLike): boolean {
  const block = String(item.coreBlock || item.extra?.['核心Block'] || '')
    .replace(/^core\./i, '')
    .trim()
    .toLowerCase();
  if (block === 'energy') return true;
  const category = String(item.categoryKey || '').split('/')[0]?.trim();
  return category === '精力';
}

/**
 * Read the stable Energy v1 fields from a DataStore Item without mutating it.
 * Missing/invalid score stays unknown; it is never coerced to zero.
 */
export function readEnergyItemSnapshot(item: EnergyItemLike): EnergyItemSnapshot | null {
  if (!isEnergyItem(item)) return null;
  const extra = item.extra || {};
  const score = readScore(extra['精力值']);
  if (score == null) return null;

  const explicitQuick = readNumber(extra['精力档位']);
  const quickLevel = explicitQuick != null && isEnergyQuickLevel(explicitQuick)
    ? explicitQuick
    : toEnergyQuickLevel(score);
  const modeText = readText(extra['评分模式']);
  const scoreMode: EnergyScoreMode | undefined = modeText === 'quick' || modeText === 'detailed' || modeText === 'percent'
    ? modeText
    : undefined;
  const captureText = readText(extra['记录方式']);
  const captureMode: EnergyCaptureMode | undefined = captureText === 'realtime' || captureText === 'retrospective' ? captureText : undefined;
  const precisionText = readText(extra['时间精度']);
  const timePrecision: EnergyTimePrecision | undefined = precisionText === 'exact' || precisionText === 'approximate' || precisionText === 'period' || precisionText === 'day'
    ? precisionText
    : undefined;

  return {
    score,
    quickLevel,
    brainScore: readScore(extra['脑力精力']),
    physicalScore: readScore(extra['体力精力']),
    scoreMode,
    captureMode,
    timePrecision,
    date: readText(item.date || extra['日期']),
    time: readText(item.startTime || extra['时间']),
    recordedAt: readText(extra['记录时间']),
    source: readText(extra['来源']),
  };
}

export function energySnapshotOccurrenceKey(snapshot: Pick<EnergyItemSnapshot, 'date' | 'time'>): string {
  return `${snapshot.date || ''}T${snapshot.time || '00:00'}`;
}
