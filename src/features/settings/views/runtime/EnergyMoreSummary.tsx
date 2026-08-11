/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item } from '@core/types/public';
import type { EnergyViewRenderModel } from '../models/energyViewModel';

interface Props {
  panel: EnergyViewRenderModel['goalPanels'][number];
  onOpenRecord?: (item: Item) => void;
}

function signed(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

export function EnergyMoreSummary({ panel, onOpenRecord }: Props) {
  const effects = panel.summary.effects;
  const quality = panel.quality;
  const activityRows = (effects?.byActivity || []).filter((row) => row.evidence !== 'insufficient').slice(0, 4);
  const dayparts = (panel.patterns?.dayparts || []).filter((row) => row.sampleCount >= 2 && row.meanScore != null);
  const best = dayparts.length ? [...dayparts].sort((a, b) => (b.meanScore || 0) - (a.meanScore || 0))[0] : null;
  const low = dayparts.length ? [...dayparts].sort((a, b) => (a.meanScore || 0) - (b.meanScore || 0))[0] : null;

  return (
    <details class="think-energy-more">
      <summary>更多 <span>›</span></summary>
      <div class="think-energy-more__list">
        <div class="think-energy-more__row"><span>数据</span><strong>{quality.sampledDays}/{quality.totalDays} 天 · {quality.sampleCount} 次 · {quality.levelLabel}</strong></div>
        <div class="think-energy-more__row"><span>时间</span><strong>实时 {quality.realtimeSamples} · 补录 {quality.retrospectiveSamples} · 精确时间 {quality.exactTimeSamples}</strong></div>
        <div class="think-energy-more__row"><span>配对</span><strong>活动前后 {quality.pairedActivityCount} · 高可信 {quality.highConfidencePairCount}</strong></div>
        {activityRows.map((row) => (
          <div class="think-energy-more__row" key={row.key}>
            <span>活动</span>
            <strong>{row.label} · {signed(row.meanDelta)} · N={row.sampleCount}</strong>
          </div>
        ))}
        {best && low && best.key !== low.key && (
          <div class="think-energy-more__row"><span>时间</span><strong>{best.label}较高，{low.label}较低</strong></div>
        )}
        {panel.experiment && (
          <div class="think-energy-more__row"><span>实验</span><strong>{panel.experiment.name} · {panel.experiment.message}</strong></div>
        )}
        {panel.summary.recentSamples.slice(0, 3).map((sample) => (
          <button class="think-energy-more__row is-record" key={sample.id} type="button" disabled={!onOpenRecord} onClick={() => onOpenRecord?.(sample.item)}>
            <span>原记录</span><strong>{sample.date || '无日期'} {sample.time || ''} · {sample.score}</strong>
          </button>
        ))}
        {!activityRows.length && !best && !panel.experiment && (
          <div class="think-energy-more__row"><span>分析</span><strong>目前先看地图；数据不足时不强行给结论。</strong></div>
        )}
      </div>
    </details>
  );
}
