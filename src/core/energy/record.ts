import type { EnergySnapshotInput, EnergySnapshotRecord } from './types';
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
 * Energy Direct Record v1 的 Markdown 协议。
 * 故意不写 模板ID / 模板来源：Energy 是 Goal-bound，但不是 Template-bound。
 */
export function buildEnergySnapshotMarkdown(input: EnergySnapshotInput | EnergySnapshotRecord): string {
  const record = 'coreBlock' in input ? input : buildEnergySnapshotRecord(input);
  const lines = [
    '<!-- start -->',
    '核心Block:: energy',
    '记录子类型:: snapshot',
  ];
  if (record.goalId) lines.push(`目标ID:: ${record.goalId}`);
  if (record.goalPath) lines.push(`目标:: ${record.goalPath}`);
  lines.push('分类:: 精力');
  lines.push(`日期:: ${record.date}`);
  if (record.time) lines.push(`时间:: ${record.time}`);
  if (record.period) lines.push(`时段:: ${record.period}`);
  if (record.themePath) lines.push(`主题:: ${record.themePath}`);
  lines.push(`精力值:: ${record.score}`);
  if (record.brainScore != null) lines.push(`脑力精力:: ${record.brainScore}`);
  if (record.physicalScore != null) lines.push(`体力精力:: ${record.physicalScore}`);
  if (record.aggregateMethod) lines.push(`综合算法:: ${record.aggregateMethod}`);
  lines.push(`精力档位:: ${record.quickLevel}`);
  lines.push(`评分模式:: ${record.scoreMode}`);
  lines.push(`记录方式:: ${record.captureMode}`);
  lines.push(`时间精度:: ${record.timePrecision}`);
  if (record.recordedAt) lines.push(`记录时间:: ${record.recordedAt}`);
  if (record.source) lines.push(`来源:: ${record.source}`);
  lines.push('<!-- end -->');
  return lines.join('\n');
}
