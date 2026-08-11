/** @jsxImportSource preact */
import { h } from 'preact';
import type { EnergyWeeklyReview } from '@core/energy/public';

interface Props { review?: EnergyWeeklyReview | null; }

function signed(value?: number): string {
  if (value == null) return '—';
  return `${value > 0 ? '+' : ''}${value}`;
}

export function EnergyWeeklyReviewPanel({ review }: Props) {
  if (!review) return null;
  return (
    <section class="think-energy-weekly" aria-label="最近一周精力复盘">
      <div class="think-energy-view__section-title">
        <strong>最近一周复盘</strong>
        <span>{review.startDate} → {review.endDate} · 稀疏数据友好</span>
      </div>
      <div class="think-energy-weekly__metrics">
        <div><span>覆盖</span><strong>{review.coverage.sampledDays}/{review.windowDays}</strong><small>{Math.round(review.coverage.coverageRatio * 100)}%</small></div>
        <div><span>综合均值</span><strong>{review.metrics.meanScore ?? '—'}</strong><small>中位 {review.metrics.medianScore ?? '—'}</small></div>
        <div><span>脑力均值</span><strong>{review.metrics.meanBrainScore ?? '—'}</strong><small>详细 N={review.metrics.detailedSamples}</small></div>
        <div><span>体力均值</span><strong>{review.metrics.meanPhysicalScore ?? '—'}</strong><small>样本 N={review.metrics.sampleCount}</small></div>
        <div><span>实时 / 补录</span><strong>{review.metrics.realtimeSamples}/{review.metrics.retrospectiveSamples}</strong><small>Missing {review.coverage.missingDays} 天</small></div>
      </div>
      <div class="think-energy-weekly__findings">
        {review.bestDaypart && <div><strong>较高时段</strong><span>{review.bestDaypart.label} · {review.bestDaypart.meanScore} · N={review.bestDaypart.sampleCount}</span></div>}
        {review.lowestDaypart && <div><strong>较低时段</strong><span>{review.lowestDaypart.label} · {review.lowestDaypart.meanScore} · N={review.lowestDaypart.sampleCount}</span></div>}
        {review.topRecovery && <div><strong>恢复候选</strong><span>{review.topRecovery.label} · {signed(review.topRecovery.meanDelta)} · N={review.topRecovery.sampleCount}</span></div>}
        {review.topDepletion && <div><strong>消耗候选</strong><span>{review.topDepletion.label} · {signed(review.topDepletion.meanDelta)} · N={review.topDepletion.sampleCount}</span></div>}
        {review.longWork?.pairedSessionCount ? <div><strong>≥120min 连续工作</strong><span>Δ {signed(review.longWork.meanDelta)} · 可配对 N={review.longWork.pairedSessionCount}</span></div> : null}
      </div>
      <div class="think-energy-weekly__observations">
        {review.observations.map((line, index) => <div key={index}>{line}</div>)}
      </div>
      <div class={`think-energy-weekly__readiness ${review.readiness.sufficientCoverage && review.readiness.sufficientSamples ? 'is-ready' : ''}`}>
        <strong>{review.readiness.sufficientCoverage && review.readiness.sufficientSamples ? '可形成周观察' : '继续采样'}</strong>
        <span>{review.readiness.message}</span>
      </div>
      <small class="think-energy-weekly__note">{review.disclaimer}</small>
    </section>
  );
}
