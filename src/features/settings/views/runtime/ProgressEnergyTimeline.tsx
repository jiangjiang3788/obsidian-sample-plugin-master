/** @jsxImportSource preact */
import { h } from 'preact';
import type { JSX } from 'preact';
import type { Item } from '@core/types/public';
import type { GoalEnergyTimelineDayModel, GoalEnergyTimelineModel, GoalEnergyTimelinePointModel } from './ProgressViewModel';

interface ProgressEnergyTimelineProps {
  timeline?: GoalEnergyTimelineModel | null;
  onOpenRecord?: (item: Item) => void;
}

function dayLabel(date: string): string {
  const match = date.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}-${match[2]}` : date;
}

function pointTitle(point: GoalEnergyTimelinePointModel): string {
  const parts = [`${point.date} ${point.time}`, `综合 ${point.score}`];
  if (point.brainScore != null) parts.push(`脑力 ${point.brainScore}`);
  if (point.physicalScore != null) parts.push(`体力 ${point.physicalScore}`);
  parts.push(point.captureMode === 'retrospective' ? '补录' : '实时');
  return parts.join(' · ');
}

function pointStyle(point: GoalEnergyTimelinePointModel): JSX.CSSProperties {
  return {
    '--think-energy-time': `${(point.minuteOfDay / 1440) * 100}%`,
    '--think-energy-score': `${point.score}%`,
  } as JSX.CSSProperties;
}

function lineStyle(left: GoalEnergyTimelinePointModel, right: GoalEnergyTimelinePointModel): JSX.CSSProperties {
  const leftX = (left.minuteOfDay / 1440) * 100;
  const rightX = (right.minuteOfDay / 1440) * 100;
  const leftY = 100 - left.score;
  const rightY = 100 - right.score;
  const dx = rightX - leftX;
  const dy = rightY - leftY;
  const distance = Math.sqrt((dx * dx) + (dy * dy));
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return {
    '--think-energy-line-left': `${leftX}%`,
    '--think-energy-line-top': `${leftY}%`,
    '--think-energy-line-width': `${distance}%`,
    '--think-energy-line-angle': `${angle}deg`,
  } as JSX.CSSProperties;
}

function EnergyDayTrack({ day, onOpenRecord }: { day: GoalEnergyTimelineDayModel; onOpenRecord?: (item: Item) => void }) {
  const detailed = day.points.filter((point) => point.brainScore != null || point.physicalScore != null);
  return (
    <div class={`think-progress-energy-timeline__day ${day.sampled ? '' : 'is-missing'}`}>
      <div class="think-progress-energy-timeline__date">{dayLabel(day.date)}</div>
      <div class="think-progress-energy-timeline__track" aria-label={`${day.date} 精力时间线`}>
        <div class="think-progress-energy-timeline__guide is-high" />
        <div class="think-progress-energy-timeline__guide is-mid" />
        <div class="think-progress-energy-timeline__guide is-low" />
        {day.points.slice(0, -1).map((point, index) => (
          <span
            key={`${point.id}-line`}
            class="think-progress-energy-timeline__line"
            style={lineStyle(point, day.points[index + 1])}
            aria-hidden="true"
          />
        ))}
        {day.points.map((point) => (
          <button
            key={point.id}
            type="button"
            class={`think-progress-energy-timeline__point ${point.captureMode === 'retrospective' ? 'is-retrospective' : ''}`}
            style={pointStyle(point)}
            title={pointTitle(point)}
            aria-label={pointTitle(point)}
            disabled={!onOpenRecord}
            onClick={() => onOpenRecord?.(point.item)}
          >
            <span>{point.score}</span>
          </button>
        ))}
        {!day.sampled && <span class="think-progress-energy-timeline__missing">未采样</span>}
      </div>
      {detailed.length > 0 && (
        <div class="think-progress-energy-timeline__dimensions">
          {detailed.map((point) => (
            <span key={`${point.id}-detail`}>
              {point.time} · 脑 {point.brainScore ?? '—'} · 体 {point.physicalScore ?? '—'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProgressEnergyTimeline({ timeline, onOpenRecord }: ProgressEnergyTimelineProps) {
  if (!timeline) return null;
  const coverage = timeline.coverage;
  return (
    <section class="think-progress-energy-timeline" aria-label="最近七天精力时间线">
      <div class="think-progress-energy-timeline__stats">
        <strong>近 {coverage.windowDays} 天：{coverage.sampledDays}/{coverage.windowDays} 天有采样</strong>
        <span>采样 {coverage.totalSamples}</span>
        <span>实时 {coverage.realtimeSamples}</span>
        <span>补录 {coverage.retrospectiveSamples}</span>
        <span>详细 {coverage.detailedSamples}</span>
      </div>
      <div class="think-progress-energy-timeline__axis" aria-hidden="true">
        <span />
        <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
      </div>
      <div class="think-progress-energy-timeline__days">
        {timeline.days.map((day) => <EnergyDayTrack key={day.date} day={day} onOpenRecord={onOpenRecord} />)}
      </div>
      <div class="think-progress-energy-timeline__legend">
        <span>实线点：实时</span>
        <span>虚线点：补录</span>
        <span>空白日：Unknown，不按 0 计算</span>
      </div>
    </section>
  );
}
