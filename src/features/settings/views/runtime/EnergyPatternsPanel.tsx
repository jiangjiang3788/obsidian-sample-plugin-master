/** @jsxImportSource preact */
import { h } from 'preact';
import type { EnergyPatternAnalytics, EnergyPatternEvidence, EnergyPatternTrend } from '@core/energy/public';

interface EnergyPatternsPanelProps {
  patterns?: EnergyPatternAnalytics | null;
}

function signed(value?: number): string {
  if (value == null) return '—';
  return `${value > 0 ? '+' : ''}${value}`;
}

function evidenceLabel(value: EnergyPatternEvidence): string {
  if (value === 'supported') return '样本较充分';
  if (value === 'exploratory') return '初步样本';
  return '观察中';
}

function trendLabel(value: EnergyPatternTrend): string {
  if (value === 'up') return '偏上升';
  if (value === 'down') return '偏下降';
  if (value === 'stable') return '较稳定';
  if (value === 'mixed') return '方向混合';
  return '样本不足';
}

function percent(value?: number): string {
  return value == null ? '—' : `${Math.round(value * 100)}%`;
}

export function EnergyPatternsPanel({ patterns }: EnergyPatternsPanelProps) {
  if (!patterns) return null;
  const pairedLag = patterns.lag.reduce((sum, row) => sum + row.sampleCount, 0);
  return (
    <section class="think-energy-patterns" aria-label="精力节律与延迟观察">
      <div class="think-energy-view__section-title">
        <strong>节律 · Lag · 连续工作 · 停止代理</strong>
        <span>近 {patterns.analysisWindowDays} 天 · 关联观察，不代表因果</span>
      </div>

      <div class="think-energy-patterns__block">
        <div class="think-energy-patterns__heading">
          <strong>日内节律</strong>
          <span>{patterns.energySampleCount} 个精力样本</span>
        </div>
        <div class="think-energy-patterns__dayparts">
          {patterns.dayparts.map((row) => (
            <div class="think-energy-patterns__metric" key={row.key}>
              <span>{row.label}</span>
              <strong>{row.meanScore ?? '—'}</strong>
              <small>N={row.sampleCount} · 中位 {row.medianScore ?? '—'}</small>
              {(row.meanBrainScore != null || row.meanPhysicalScore != null) && (
                <small>脑 {row.meanBrainScore ?? '—'} · 体 {row.meanPhysicalScore ?? '—'}</small>
              )}
            </div>
          ))}
        </div>
      </div>

      <div class="think-energy-patterns__block">
        <div class="think-energy-patterns__heading">
          <strong>延迟变化</strong>
          <span>{pairedLag} 组可配对样本；目标时点附近没有记录就保持 Missing</span>
        </div>
        <div class="think-energy-patterns__lag-grid">
          {patterns.lag.map((row) => (
            <div class="think-energy-patterns__card" key={row.key}>
              <div><strong>{row.label}</strong><span>{trendLabel(row.trend)}</span></div>
              <b>{signed(row.meanDelta)}</b>
              <small>中位 {signed(row.medianDelta)} · N={row.sampleCount}</small>
              {(row.meanBrainDelta != null || row.meanPhysicalDelta != null) && (
                <small>脑 {signed(row.meanBrainDelta)} · 体 {signed(row.meanPhysicalDelta)}</small>
              )}
              <small>{evidenceLabel(row.evidence)}</small>
            </div>
          ))}
        </div>
      </div>

      <div class="think-energy-patterns__block">
        <div class="think-energy-patterns__heading">
          <strong>连续工作时长</strong>
          <span>相邻任务间隔 ≤15min 合并为一段连续工作；仅前后都有精力样本时计算变化</span>
        </div>
        <div class="think-energy-patterns__table">
          {patterns.continuousWork.map((row) => (
            <div class="think-energy-patterns__row" key={row.key}>
              <strong>{row.label}</strong>
              <span>{row.sessionCount} 段</span>
              <span>可配对 {row.pairedSessionCount}</span>
              <span>Δ {signed(row.meanDelta)}</span>
              <span>中位 {signed(row.medianDelta)}</span>
              <span>{trendLabel(row.trend)} · {evidenceLabel(row.evidence)}</span>
            </div>
          ))}
        </div>
        <small class="think-energy-patterns__note">总连续工作 {patterns.continuousSessionCount} 段，可分析 {patterns.pairedContinuousSessionCount} 段。</small>
      </div>

      <div class="think-energy-patterns__block">
        <div class="think-energy-patterns__heading">
          <strong>高能后持续 / 停止代理</strong>
          <span>只描述行为代理，不等同于心理“停止能力”</span>
        </div>
        <div class="think-energy-patterns__stop-grid">
          <div class="think-energy-patterns__metric"><span>高能样本 ≥80</span><strong>{patterns.stopProxy.highEnergySampleCount}</strong></div>
          <div class="think-energy-patterns__metric"><span>随后进入/处于工作</span><strong>{patterns.stopProxy.followedByWorkCount}</strong></div>
          <div class="think-energy-patterns__metric"><span>平均到停止</span><strong>{patterns.stopProxy.meanStopLatencyMinutes ?? '—'}</strong><small>分钟</small></div>
          <div class="think-energy-patterns__metric"><span>≥120min 持续</span><strong>{percent(patterns.stopProxy.longContinuationRatio)}</strong><small>{patterns.stopProxy.longContinuationCount} 次</small></div>
          <div class="think-energy-patterns__metric"><span>延续到 23:00+/跨日</span><strong>{percent(patterns.stopProxy.lateNightRatio)}</strong><small>{patterns.stopProxy.lateNightCount} 次</small></div>
        </div>
        {patterns.stopProxy.recentSamples.length > 0 && (
          <div class="think-energy-patterns__events">
            {patterns.stopProxy.recentSamples.map((row) => (
              <div key={row.energyItemId}>
                <span>{row.date} {row.time} · 精力 {row.score}</span>
                <span>连续工作 {row.sessionDurationMinutes}min · 到停止 {row.stopLatencyMinutes}min · {row.sessionStartTime}–{row.sessionEndTime}{row.lateNight ? ' · 深夜延续' : ''}</span>
              </div>
            ))}
          </div>
        )}
        <small class="think-energy-patterns__note">可信度：{evidenceLabel(patterns.stopProxy.evidence)}。这里不把“高能后继续工作”解释为因果或人格能力。</small>
      </div>
    </section>
  );
}
