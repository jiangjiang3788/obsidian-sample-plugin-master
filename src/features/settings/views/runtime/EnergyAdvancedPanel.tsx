/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item } from '@core/types/public';
import type { EnergyViewRenderModel } from '../models/energyViewModel';
import { ProgressEnergyEffects } from './ProgressEnergyEffects';
import { EnergyPatternsPanel } from './EnergyPatternsPanel';
import { EnergyManagementPanel } from './EnergyManagementPanel';
import { EnergyWeeklyReviewPanel } from './EnergyWeeklyReviewPanel';
import { EnergyExperimentPanel } from './EnergyExperimentPanel';

interface Props {
  panel: EnergyViewRenderModel['goalPanels'][number];
  model: EnergyViewRenderModel;
  onOpenRecord?: (item: Item) => void;
}

export function EnergyAdvancedPanel({ panel, model, onOpenRecord }: Props) {
  const summary = panel.summary;
  return (
    <details class="think-energy-advanced">
      <summary><span>高级统计（点击展开）</span><small>Lag、连续工作、样本 N、周报、实验</small></summary>
      <div class="think-energy-advanced__content">
        {model.config.showEffects && <ProgressEnergyEffects effects={summary.effects} />}
        {model.config.showPatterns && <EnergyPatternsPanel patterns={panel.patterns} />}
        {model.config.showWeeklyReview && <EnergyWeeklyReviewPanel review={panel.weeklyReview} />}
        {model.config.showManagement && <EnergyManagementPanel management={panel.management} />}
        {model.config.showExperiment && (
          <EnergyExperimentPanel
            experiment={panel.experiment}
            configured={Boolean(model.config.experimentName && model.config.experimentInterventionDate)}
          />
        )}
        <section class="think-energy-advanced__recent" aria-label="最近精力原始记录">
          <div class="think-energy-view__section-title"><strong>最近原始记录</strong><span>用于核对上下文，不改变原始 Markdown</span></div>
          <div class="think-energy-advanced__recent-list">
            {summary.recentSamples.map((sample) => (
              <button key={sample.id} type="button" disabled={!onOpenRecord} onClick={() => onOpenRecord?.(sample.item)}>
                <span>{sample.date || '无日期'} {sample.time || ''}</span>
                <strong>{sample.score}</strong>
                <span>脑 {sample.brainScore ?? '—'} · 体 {sample.physicalScore ?? '—'}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </details>
  );
}
