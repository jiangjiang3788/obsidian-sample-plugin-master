/** @jsxImportSource preact */
import { h } from 'preact';
import type { JSX } from 'preact';
import type { GoalEnergyTimelineDayModel, GoalEnergyTimelineModel, GoalEnergyTimelinePointModel } from '../models/progressViewModel';

interface EnergyWeeklyMapProps {
  timeline?: GoalEnergyTimelineModel | null;
  selectedId?: string | null;
  onSelect?: (point: GoalEnergyTimelinePointModel) => void;
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const TIME_TICKS = [0, 360, 720, 1080, 1440];

function shortDate(date: string): string {
  const match = date.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}-${match[2]}` : date;
}

function weekday(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? '' : WEEKDAYS[parsed.getDay()];
}

function pointLevel(score: number): 20 | 40 | 60 | 80 | 100 {
  if (score < 30) return 20;
  if (score < 50) return 40;
  if (score < 70) return 60;
  if (score < 90) return 80;
  return 100;
}


function verticalPositionStyle(minute: number): JSX.CSSProperties {
  return { '--think-energy-map-position': `${(minute / 1440) * 100}%` } as JSX.CSSProperties;
}

function pointStyle(point: GoalEnergyTimelinePointModel): JSX.CSSProperties {
  return { '--think-energy-map-time': `${Math.max(0, Math.min(100, (point.minuteOfDay / 1440) * 100))}%` } as JSX.CSSProperties;
}

function connectorStyle(day: GoalEnergyTimelineDayModel): JSX.CSSProperties | undefined {
  if (day.points.length < 2) return undefined;
  const minutes = day.points.map((point) => point.minuteOfDay).sort((a, b) => a - b);
  const top = (minutes[0] / 1440) * 100;
  const bottom = (minutes[minutes.length - 1] / 1440) * 100;
  return {
    '--think-energy-map-line-top': `${top}%`,
    '--think-energy-map-line-height': `${Math.max(0, bottom - top)}%`,
  } as JSX.CSSProperties;
}

function pointTitle(point: GoalEnergyTimelinePointModel): string {
  const parts = [`${point.date} ${point.time}`, `综合 ${point.score}`];
  if (point.brainScore != null) parts.push(`脑力 ${point.brainScore}`);
  if (point.physicalScore != null) parts.push(`体力 ${point.physicalScore}`);
  parts.push(point.captureMode === 'retrospective' ? '补录' : '实时');
  return parts.join(' · ');
}

function DayLane({ day, selectedId, onSelect }: {
  day: GoalEnergyTimelineDayModel;
  selectedId?: string | null;
  onSelect?: (point: GoalEnergyTimelinePointModel) => void;
}) {
  const lineStyle = connectorStyle(day);
  return (
    <div class={`think-energy-map__day ${day.sampled ? '' : 'is-missing'}`}>
      <div class="think-energy-map__day-head">
        <strong>{weekday(day.date)}</strong>
        <span>{shortDate(day.date)}</span>
      </div>
      <div class="think-energy-map__lane" aria-label={`${day.date} 精力记录`}>
        {TIME_TICKS.map((tick) => <span key={tick} class="think-energy-map__guide" style={verticalPositionStyle(tick)} aria-hidden="true" />)}
        {lineStyle && <span class="think-energy-map__connector" style={lineStyle} aria-hidden="true" />}
        {day.points.map((point) => {
          const level = pointLevel(point.score);
          const selected = selectedId === point.id;
          return (
            <button
              key={point.id}
              type="button"
              class={`think-energy-map__point is-level-${level} ${point.captureMode === 'retrospective' ? 'is-retrospective' : ''} ${selected ? 'is-selected' : ''}`}
              style={pointStyle(point)}
              title={pointTitle(point)}
              aria-label={pointTitle(point)}
              onClick={() => onSelect?.(point)}
            >
              <span class="think-energy-map__point-value">{point.score}</span>
            </button>
          );
        })}
        {!day.sampled && <div class="think-energy-map__missing"><span>○</span><strong>无记录</strong></div>}
      </div>
    </div>
  );
}

export function EnergyWeeklyMap({ timeline, selectedId, onSelect }: EnergyWeeklyMapProps) {
  if (!timeline) return null;
  return (
    <section class="think-energy-map" aria-label="每周精力地图">
      <div class="think-energy-map__header">
        <div>
          <strong>每周精力地图</strong>
          <span>{timeline.coverage.sampledDays}/{timeline.coverage.windowDays} 天有记录</span>
        </div>
        <div class="think-energy-map__legend" aria-label="精力图例">
          <span><i class="is-level-20" />20 低</span>
          <span><i class="is-level-40" />40 偏低</span>
          <span><i class="is-level-60" />60 中等</span>
          <span><i class="is-level-80" />80 较高</span>
          <span><i class="is-level-100" />100 很高</span>
          <span><b class="is-solid" />实时</span>
          <span><b class="is-hollow" />补录</span>
        </div>
      </div>

      <div class="think-energy-map__scroll">
        <div class="think-energy-map__chart">
          <div class="think-energy-map__axis">
            <div class="think-energy-map__axis-head" />
            <div class="think-energy-map__axis-track">
              {TIME_TICKS.map((tick) => (
                <span key={tick} style={verticalPositionStyle(tick)}>{String(Math.floor(tick / 60)).padStart(2, '0')}:00</span>
              ))}
            </div>
          </div>
          <div class="think-energy-map__days">
            {timeline.days.map((day) => <DayLane key={day.date} day={day} selectedId={selectedId} onSelect={onSelect} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
