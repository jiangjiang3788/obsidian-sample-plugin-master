/** @jsxImportSource preact */
import { h } from 'preact';
import type { EnergyExperimentComparison, EnergyExperimentPeriodSummary } from '@core/energy/public';

interface Props { experiment?: EnergyExperimentComparison | null; configured?: boolean; }

function signed(value?: number): string {
  if (value == null) return '—';
  return `${value > 0 ? '+' : ''}${value}`;
}

function PeriodCard({ row, title }: { row: EnergyExperimentPeriodSummary; title: string }) {
  return (
    <div class="think-energy-experiment__period">
      <div><strong>{title}</strong><span>{row.startDate} → {row.endDate}</span></div>
      <b>{row.meanScore ?? '—'}</b>
      <small>综合均值 · 中位 {row.medianScore ?? '—'}</small>
      <small>脑 {row.meanBrainScore ?? '—'} · 体 {row.meanPhysicalScore ?? '—'}</small>
      <small>{row.sampledDays}/{row.windowDays} 天 · N={row.sampleCount} · 详细 {row.detailedSamples}</small>
    </div>
  );
}

export function EnergyExperimentPanel({ experiment, configured }: Props) {
  if (!configured) return (
    <section class="think-energy-experiment think-energy-experiment--empty">
      <div class="think-energy-view__section-title"><strong>N-of-1 个人实验</strong><span>在 EnergyView 设置中配置实验名称与干预开始日期</span></div>
      <div>实验采用“干预前 N 天 vs 干预后 N 天”的同人前后比较；默认 N=7。</div>
    </section>
  );
  if (!experiment) return null;
  const trend = experiment.trend === 'up' ? '干预期更高' : experiment.trend === 'down' ? '干预期更低' : experiment.trend === 'stable' ? '差异较小' : '样本不足';
  return (
    <section class="think-energy-experiment" aria-label="N-of-1 个人实验">
      <div class="think-energy-view__section-title">
        <strong>N-of-1 · {experiment.name}</strong>
        <span>干预起点 {experiment.interventionDate} · 前后各 {experiment.windowDays} 天</span>
      </div>
      {experiment.hypothesis && <div class="think-energy-experiment__hypothesis">假设：{experiment.hypothesis}</div>}
      <div class="think-energy-experiment__periods">
        <PeriodCard row={experiment.baseline} title="基线期" />
        <div class="think-energy-experiment__delta"><span>{trend}</span><strong>{signed(experiment.deltaMeanScore)}</strong><small>综合均值变化</small><small>脑 {signed(experiment.deltaMeanBrainScore)} · 体 {signed(experiment.deltaMeanPhysicalScore)}</small></div>
        <PeriodCard row={experiment.intervention} title="干预期" />
      </div>
      <div class={`think-energy-experiment__status think-energy-experiment__status--${experiment.readiness}`}>
        <strong>{experiment.readiness === 'ready' ? '可以做观察性比较' : '仍在收集'}</strong><span>{experiment.message}</span>
      </div>
      <small class="think-energy-experiment__note">{experiment.disclaimer}</small>
    </section>
  );
}
