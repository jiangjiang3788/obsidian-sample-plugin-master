/** @jsxImportSource preact */
import { h } from 'preact';
import type { GoalEnergyEffectRowModel, GoalEnergyEffectsModel } from './ProgressViewModel';

interface ProgressEnergyEffectsProps {
  effects?: GoalEnergyEffectsModel | null;
}

function signed(value: number | undefined): string {
  if (value == null) return '—';
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

function trendLabel(row: GoalEnergyEffectRowModel): string {
  if (row.evidence === 'insufficient' || row.trend === 'insufficient') return '观察中';
  if (row.trend === 'recovery') return '偏恢复';
  if (row.trend === 'depletion') return '偏消耗';
  return '变化混合';
}

function evidenceLabel(row: GoalEnergyEffectRowModel): string {
  if (row.evidence === 'supported') return '样本较充分';
  if (row.evidence === 'exploratory') return '初步样本';
  return '样本不足';
}

function EffectRow({ row }: { row: GoalEnergyEffectRowModel }) {
  return (
    <div class={`think-progress-energy-effects__row is-${row.trend}`}>
      <div class="think-progress-energy-effects__label">
        <strong>{row.label}</strong>
        <span>{trendLabel(row)} · N={row.sampleCount} · {evidenceLabel(row)}</span>
      </div>
      <div class="think-progress-energy-effects__delta" title={`中位变化 ${signed(row.medianDelta)}`}>
        <strong>{signed(row.meanDelta)}</strong>
        <span>综合</span>
      </div>
      <div class="think-progress-energy-effects__dimension">
        <span>脑 {signed(row.meanBrainDelta)}</span>
        <span>体 {signed(row.meanPhysicalDelta)}</span>
      </div>
    </div>
  );
}

function EffectGroup({ title, rows }: { title: string; rows: GoalEnergyEffectRowModel[] }) {
  if (!rows.length) return null;
  return (
    <section class="think-progress-energy-effects__group">
      <div class="think-progress-energy-effects__group-title">{title}</div>
      <div class="think-progress-energy-effects__rows">
        {rows.map((row) => <EffectRow key={`${title}-${row.key}`} row={row} />)}
      </div>
    </section>
  );
}

export function ProgressEnergyEffects({ effects }: ProgressEnergyEffectsProps) {
  if (!effects || effects.eligibleActivityCount === 0) return null;
  const noPairs = effects.pairedActivityCount === 0;
  const recovery = effects.byActivity.find((row) => row.trend === 'recovery' && row.evidence !== 'insufficient');
  const depletion = effects.byActivity.find((row) => row.trend === 'depletion' && row.evidence !== 'insufficient');
  return (
    <section class="think-progress-energy-effects" aria-label="活动前后精力变化分析">
      <div class="think-progress-energy-effects__header">
        <div>
          <strong>活动前后变化</strong>
          <span>只计算有前后精力样本、且没有明显其他任务干扰的活动</span>
        </div>
        <div class="think-progress-energy-effects__coverage">
          可配对 {effects.pairedActivityCount}/{effects.eligibleActivityCount} · 高可信 {effects.highConfidencePairCount}
        </div>
      </div>
      {noPairs ? (
        <div class="think-progress-energy-effects__empty">目前没有足够接近的“活动前 + 活动后”精力样本，继续自然记录即可。</div>
      ) : (
        <>
          {(recovery || depletion) && (
            <div class="think-progress-energy-effects__discoveries">
              {recovery && <span>可能恢复：<strong>{recovery.label}</strong> {signed(recovery.meanDelta)} · N={recovery.sampleCount}</span>}
              {depletion && <span>可能消耗：<strong>{depletion.label}</strong> {signed(depletion.meanDelta)} · N={depletion.sampleCount}</span>}
            </div>
          )}
          <EffectGroup title="按活动" rows={effects.byActivity} />
          <EffectGroup title="按主题" rows={effects.byTheme} />
          <EffectGroup title="按持续时长" rows={effects.byDuration} />
        </>
      )}
      <div class="think-progress-energy-effects__note">
        “偏恢复 / 偏消耗”只表示你个人记录中的前后关联，不代表活动造成了该变化；N&lt;3 时始终只标“观察中”。
      </div>
    </section>
  );
}
