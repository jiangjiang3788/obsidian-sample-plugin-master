import type { EnergySnapshotInput, EnergySnapshotRecord } from './types';
import { createRecordId } from '@/core/records/RecordId';
import { encodeRecordBlock } from '@/core/records/codec/MarkdownRecordCodec';
import { calculateDetailedEnergyScore, normalizeEnergyScore, toEnergyQuickLevel } from './scale';

export const ENERGY_TARGET_FILE = '01/目标精力.md';
export const ENERGY_APPEND_UNDER_HEADER = '## {{goalPath}}';

function clean(value?: string): string {
  return String(value || '').trim();
}

export function buildEnergySnapshotRecord(input: EnergySnapshotInput): EnergySnapshotRecord {
  const captureMode = input.captureMode || 'realtime';
  const timePrecision = input.timePrecision || (input.time ? 'exact' : input.period ? 'period' : 'day');
  const isDetailed = input.scoreMode === 'detailed';
  const brainScore = isDetailed ? normalizeEnergyScore(input.brainScore) : undefined;
  const physicalScore = isDetailed ? normalizeEnergyScore(input.physicalScore) : undefined;
  const score = isDetailed
    ? calculateDetailedEnergyScore(input.brainScore, input.physicalScore)
    : normalizeEnergyScore(input.score);

  return {
    ...input,
    recordId: createRecordId('energy'),
    goalId: clean(input.goalId) || undefined,
    goalPath: clean(input.goalPath) || undefined,
    themePath: clean(input.themePath) || undefined,
    time: clean(input.time) || undefined,
    period: clean(input.period) || undefined,
    recordedAt: clean(input.recordedAt) || undefined,
    source: clean(input.source) || undefined,
    coreBlock: 'energy',
    subtype: 'snapshot',
    categoryKey: '精力',
    score,
    scoreMode: input.scoreMode || 'quick',
    captureMode,
    timePrecision,
    quickLevel: toEnergyQuickLevel(score),
    brainScore,
    physicalScore,
    aggregateMethod: isDetailed ? 'arithmetic-mean-v1' : undefined,
  };
}

/**
 * Energy Snapshot uses the universal Record v2 envelope.
 * 故意不写 模板ID / 模板来源：Energy 是 Goal-bound，但不是 Template-bound。
 */
export function buildEnergySnapshotMarkdown(input: EnergySnapshotInput | EnergySnapshotRecord): string {
  const record = 'coreBlock' in input ? input : buildEnergySnapshotRecord(input);
  return encodeRecordBlock({
    recordId: record.recordId,
    coreBlock: 'energy',
    fields: {
      '记录子类型': 'snapshot',
      '目标ID': record.goalId,
      '目标': record.goalPath,
      '分类': '精力',
      '日期': record.date,
      '时间': record.time,
      '时段': record.period,
      '主题': record.themePath,
      '精力值': record.score,
      '脑力精力': record.brainScore,
      '体力精力': record.physicalScore,
      '综合算法': record.aggregateMethod,
      '精力档位': record.quickLevel,
      '评分模式': record.scoreMode,
      '记录方式': record.captureMode,
      '时间精度': record.timePrecision,
      '记录时间': record.recordedAt,
      '来源': record.source,
    },
  });
}
