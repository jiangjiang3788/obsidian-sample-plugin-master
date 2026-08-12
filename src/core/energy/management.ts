import type { RecordViewItem } from '@/core/records/RecordEntity';
import { buildEnergyEffects, type EnergyEffectAggregate } from './effects';
import { isEnergyItem, readEnergyItemSnapshot } from './item';
import { buildEnergyPatterns } from './patterns';
import type {
  BuildEnergyManagementOptions,
  EnergyDimensionFocus,
  EnergyManagementCandidate,
  EnergyManagementGuardrail,
  EnergyManagementLatestState,
  EnergyManagementModel,
  EnergyManagementState,
} from './managementTypes';

const DEFAULT_MAXIMUM_CANDIDATES = 3;
const DEFAULT_MINIMUM_PERSONAL_SAMPLES = 3;
const DEFAULT_HIGH_ENERGY_THRESHOLD = 80;
const DEFAULT_DIMENSION_GAP = 15;

function occurrenceKey(item: RecordViewItem): string {
  const snapshot = readEnergyItemSnapshot(item);
  if (!snapshot) return '';
  return `${snapshot.date || ''}T${snapshot.time || '00:00'}`;
}

function latestEnergyItem(items: RecordViewItem[]): RecordViewItem | undefined {
  return items
    .filter(isEnergyItem)
    .filter((item) => !!readEnergyItemSnapshot(item))
    .sort((left, right) => occurrenceKey(right).localeCompare(occurrenceKey(left)))[0];
}

function stateFor(score: number, highThreshold: number): EnergyManagementState {
  if (score <= 40) return 'low';
  if (score <= 60) return 'guarded';
  if (score < highThreshold) return 'available';
  return 'high';
}

function stateLabel(state: EnergyManagementState): string {
  if (state === 'low') return '低精力';
  if (state === 'guarded') return '需要节制';
  if (state === 'available') return '可用精力';
  return '高精力';
}

function dimensionFocus(brain: number | undefined, physical: number | undefined, gap: number): EnergyDimensionFocus {
  if (brain == null || physical == null) return 'balanced';
  if (physical - brain >= gap) return 'brain-low';
  if (brain - physical >= gap) return 'physical-low';
  return 'balanced';
}

function dimensionLabel(focus: EnergyDimensionFocus, brain?: number, physical?: number): string | undefined {
  if (focus === 'brain-low') return `脑力明显低于体力（脑 ${brain} / 体 ${physical}）`;
  if (focus === 'physical-low') return `体力明显低于脑力（脑 ${brain} / 体 ${physical}）`;
  if (brain != null && physical != null) return `脑体较均衡（脑 ${brain} / 体 ${physical}）`;
  return undefined;
}

function latestState(items: RecordViewItem[], highThreshold: number, dimensionGap: number): EnergyManagementLatestState | null {
  const item = latestEnergyItem(items);
  if (!item) return null;
  const snapshot = readEnergyItemSnapshot(item);
  if (!snapshot) return null;
  const state = stateFor(snapshot.score, highThreshold);
  const focus = dimensionFocus(snapshot.brainScore, snapshot.physicalScore, dimensionGap);
  return {
    score: snapshot.score,
    brainScore: snapshot.brainScore,
    physicalScore: snapshot.physicalScore,
    date: snapshot.date,
    time: snapshot.time,
    state,
    stateLabel: stateLabel(state),
    dimensionFocus: focus,
    dimensionLabel: dimensionLabel(focus, snapshot.brainScore, snapshot.physicalScore),
  };
}

function evidenceWeight(value: EnergyEffectAggregate['evidence']): number {
  if (value === 'supported') return 2;
  if (value === 'exploratory') return 1;
  return 0;
}

function focusBonus(row: EnergyEffectAggregate, focus: EnergyDimensionFocus, trend: 'recovery' | 'depletion'): number {
  const sign = trend === 'recovery' ? 1 : -1;
  if (focus === 'brain-low' && row.meanBrainDelta != null) return Math.max(0, sign * row.meanBrainDelta) / 4;
  if (focus === 'physical-low' && row.meanPhysicalDelta != null) return Math.max(0, sign * row.meanPhysicalDelta) / 4;
  return 0;
}

function candidateReason(row: EnergyEffectAggregate, focus: EnergyDimensionFocus): string {
  const parts = [`综合平均 ${row.meanDelta > 0 ? '+' : ''}${row.meanDelta}`];
  if (focus === 'brain-low' && row.meanBrainDelta != null) parts.push(`脑力 ${row.meanBrainDelta > 0 ? '+' : ''}${row.meanBrainDelta}`);
  if (focus === 'physical-low' && row.meanPhysicalDelta != null) parts.push(`体力 ${row.meanPhysicalDelta > 0 ? '+' : ''}${row.meanPhysicalDelta}`);
  parts.push(`N=${row.sampleCount}`);
  return parts.join(' · ');
}

function selectCandidates(
  rows: EnergyEffectAggregate[],
  trend: 'recovery' | 'depletion',
  focus: EnergyDimensionFocus,
  limit: number,
  minimumSamples: number,
): EnergyManagementCandidate[] {
  return rows
    .filter((row) => row.trend === trend && row.sampleCount >= minimumSamples && row.evidence !== 'insufficient')
    .sort((left, right) => {
      const evidenceDelta = evidenceWeight(right.evidence) - evidenceWeight(left.evidence);
      if (evidenceDelta) return evidenceDelta;
      const leftMagnitude = Math.abs(left.meanDelta) + focusBonus(left, focus, trend);
      const rightMagnitude = Math.abs(right.meanDelta) + focusBonus(right, focus, trend);
      if (rightMagnitude !== leftMagnitude) return rightMagnitude - leftMagnitude;
      return right.sampleCount - left.sampleCount;
    })
    .slice(0, limit)
    .map((row) => ({
      key: row.key,
      label: row.label,
      sampleCount: row.sampleCount,
      meanDelta: row.meanDelta,
      medianDelta: row.medianDelta,
      meanBrainDelta: row.meanBrainDelta,
      meanPhysicalDelta: row.meanPhysicalDelta,
      evidence: row.evidence,
      reason: candidateReason(row, focus),
    }));
}

function buildGuardrails(items: RecordViewItem[], evidenceRecords: RecordViewItem[], analysisWindowDays: number, highThreshold: number): EnergyManagementGuardrail[] {
  const patterns = buildEnergyPatterns(items, { activityRecords: evidenceRecords, analysisWindowDays, highEnergyThreshold: highThreshold });
  if (!patterns) return [];
  const rows: EnergyManagementGuardrail[] = [];
  const stop = patterns.stopProxy;
  if (stop.followedByWorkCount >= 3 && stop.evidence !== 'insufficient') {
    const longRatio = stop.longContinuationRatio || 0;
    const lateRatio = stop.lateNightRatio || 0;
    if (longRatio >= 0.5 || lateRatio >= 0.4) {
      const details = [
        `高能后进入/处于工作 N=${stop.followedByWorkCount}`,
        `≥120min ${Math.round(longRatio * 100)}%`,
        `深夜延续 ${Math.round(lateRatio * 100)}%`,
      ];
      rows.push({
        key: 'preserve-capacity',
        level: 'caution',
        title: '高能时也要预先设停止点',
        detail: details.join(' · '),
        sampleCount: stop.followedByWorkCount,
        evidence: stop.evidence,
      });
    }
  }

  const longBucket = patterns.continuousWork.find((row) => row.key === 'ge120');
  if (longBucket && longBucket.pairedSessionCount >= 3 && longBucket.meanDelta != null && longBucket.meanDelta <= -8) {
    rows.push({
      key: 'long-session',
      level: 'caution',
      title: '长连续工作是当前值得防守的区间',
      detail: `≥120min 前后综合平均 ${longBucket.meanDelta > 0 ? '+' : ''}${longBucket.meanDelta} · 可配对 N=${longBucket.pairedSessionCount}`,
      sampleCount: longBucket.pairedSessionCount,
      evidence: longBucket.evidence,
    });
  }
  return rows;
}

function managementHeadline(latest: EnergyManagementLatestState): string {
  if (latest.state === 'low') return '当前先考虑恢复，不必把低能状态硬撑成高负荷时段';
  if (latest.state === 'guarded') return '当前有一定可用精力，但更适合控制负荷和工作长度';
  if (latest.state === 'available') return '当前精力可用，优先把它用在高价值事项，同时观察消耗边界';
  return '当前处于高精力，重点不是继续加码，而是把力量用在重要事项并保留停止能力';
}

function managementGuidance(latest: EnergyManagementLatestState, recoveryCount: number, cautionCount: number): string {
  if (latest.dimensionFocus === 'brain-low') return recoveryCount ? '脑力低于体力：优先参考对脑力恢复更友好的个人候选。' : '脑力低于体力，但个人恢复样本还不够，先记录而不是猜。';
  if (latest.dimensionFocus === 'physical-low') return recoveryCount ? '体力低于脑力：优先参考对体力恢复更友好的个人候选。' : '体力低于脑力，但个人恢复样本还不够，先记录而不是猜。';
  if (latest.state === 'low' || latest.state === 'guarded') return recoveryCount ? '下面只列你的历史数据里重复出现的恢复候选；它们是观察关联，不是因果处方。' : '当前没有达到最小样本门槛的个人恢复候选。';
  return cautionCount ? '高能不等于无限可用；下面的消耗候选和停止护栏用于帮助你保存力量。' : '目前没有足够个人样本形成明确消耗候选，保持观察即可。';
}

/**
 * Convert the existing observational Energy analytics into conservative, explainable management cues.
 * No medical claims, causal claims, or synthetic scores are introduced: every personalized cue carries sample evidence.
 */
export function buildEnergyManagement(items: RecordViewItem[], options: BuildEnergyManagementOptions = {}): EnergyManagementModel | null {
  const maximumCandidates = Math.max(1, Math.min(5, Math.floor(options.maximumCandidates ?? DEFAULT_MAXIMUM_CANDIDATES)));
  const minimumPersonalSamples = Math.max(3, Math.min(10, Math.floor(options.minimumPersonalSamples ?? DEFAULT_MINIMUM_PERSONAL_SAMPLES)));
  const highThreshold = Math.max(60, Math.min(100, Math.floor(options.highEnergyThreshold ?? DEFAULT_HIGH_ENERGY_THRESHOLD)));
  const dimensionGap = Math.max(5, Math.min(50, Math.floor(options.dimensionGapThreshold ?? DEFAULT_DIMENSION_GAP)));
  const analysisWindowDays = Math.max(7, Math.min(90, Math.floor(options.analysisWindowDays ?? 30)));
  const latest = latestState(items, highThreshold, dimensionGap);
  if (!latest) return null;

  const evidenceRecords = options.evidenceRecords || items;
  const effects = buildEnergyEffects(evidenceRecords);
  const activityRows = effects?.byActivity || [];
  const recoveryCandidates = selectCandidates(activityRows, 'recovery', latest.dimensionFocus, maximumCandidates, minimumPersonalSamples);
  const cautionCandidates = selectCandidates(activityRows, 'depletion', latest.dimensionFocus, maximumCandidates, minimumPersonalSamples);
  const guardrails = buildGuardrails(items, evidenceRecords, analysisWindowDays, highThreshold);
  const pairedActivityCount = effects?.pairedActivityCount || 0;
  const sufficient = recoveryCandidates.length > 0 || cautionCandidates.length > 0 || guardrails.length > 0;

  return {
    latest,
    headline: managementHeadline(latest),
    guidance: managementGuidance(latest, recoveryCandidates.length, cautionCandidates.length),
    recoveryCandidates,
    cautionCandidates,
    guardrails,
    readiness: {
      pairedActivityCount,
      recoveryCandidateCount: recoveryCandidates.length,
      depletionCandidateCount: cautionCandidates.length,
      stopProxySampleCount: guardrails.find((row) => row.key === 'preserve-capacity')?.sampleCount || 0,
      sufficientForPersonalSuggestions: sufficient,
      message: sufficient
        ? `已有 ${pairedActivityCount} 个活动前后可配对样本；只展示达到 N≥${minimumPersonalSamples} 的个人候选。`
        : `目前只有 ${pairedActivityCount} 个活动前后可配对样本，尚没有达到 N≥${minimumPersonalSamples} 且方向稳定的个人候选。`,
    },
    disclaimer: '个人历史关联，仅用于自我观察与安排，不代表因果、医学判断或必须执行的建议。',
  };
}
