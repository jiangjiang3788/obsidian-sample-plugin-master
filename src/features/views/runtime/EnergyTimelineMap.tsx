/** @jsxImportSource preact */
import { h } from 'preact';
import type { JSX } from 'preact';
import type { EnergyPeriodRenderModel, EnergyPeriodSampleModel } from '../models/energyViewModel';
import { EnergyDot } from './EnergyDot';
import { buildEnergyDotVisual, energyDotStyle } from './EnergyVisualEncoding';
import type { EnergyMapSelection } from './EnergyMapTypes';

interface Props {
  period: EnergyPeriodRenderModel;
  selectedKey?: string | null;
  onSelect?: (selection: EnergyMapSelection) => void;
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const TIME_TICKS = [0, 360, 720, 1080, 1440];

function weekday(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? '' : WEEKDAYS[parsed.getDay()];
}

function shortDate(date: string): string {
  const match = date.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}-${match[2]}` : date;
}

function dayNumber(date: string): string {
  return date.slice(-2);
}

function axisStyle(name: '--think-energy-x' | '--think-energy-y', percent: number): JSX.CSSProperties {
  return { [name]: `${percent}%` } as JSX.CSSProperties;
}

function dayCountStyle(count: number): JSX.CSSProperties {
  return { '--think-energy-day-count': String(count) } as JSX.CSSProperties;
}

function sampleTitle(sample: EnergyPeriodSampleModel): string {
  const parts = [`${sample.date} ${sample.time}`, `综合 ${sample.score}`];
  if (sample.brainScore != null) parts.push(`脑力 ${sample.brainScore}`);
  if (sample.physicalScore != null) parts.push(`体力 ${sample.physicalScore}`);
  parts.push(sample.captureMode === 'retrospective' ? '补录' : '实时');
  return parts.join(' · ');
}

function sampleVisual(sample: EnergyPeriodSampleModel) {
  return buildEnergyDotVisual({
    score: sample.score,
    capture: sample.captureMode,
    density: 'timeline',
  });
}

export function EnergyDayMap({ period, selectedKey, onSelect }: Props) {
  const day = period.days[0];
  return (
    <section class="think-energy-period-map think-energy-day-map" aria-label="日精力地图">
      <div class="think-energy-period-map__heading"><span>{period.label}</span></div>
      <div class="think-energy-day-map__track">
        {TIME_TICKS.map((tick) => (
          <span key={tick} class="think-energy-day-map__guide" style={axisStyle('--think-energy-x', (tick / 1440) * 100)}>
            <i />
            <b>{String(Math.floor(tick / 60)).padStart(2, '0')}:00</b>
          </span>
        ))}
        {day?.samples.map((sample) => {
          const visual = sampleVisual(sample);
          return (
            <EnergyDot
              key={sample.id}
              visual={visual}
              selected={selectedKey === sample.id}
              className="think-energy-map-dot"
              style={energyDotStyle(visual, { '--think-energy-x': `${(sample.minuteOfDay / 1440) * 100}%` })}
              title={sampleTitle(sample)}
              onClick={() => onSelect?.({ kind: 'sample', sample })}
            />
          );
        })}
        {!day?.sampled && <span class="think-energy-day-map__empty">当天未记录</span>}
      </div>
      <div class="think-energy-period-map__hint">实心＝实时 · 空心＝补录 · 5 档尺寸＝精力高低</div>
    </section>
  );
}

export function EnergyDateTimeMap({ period, selectedKey, onSelect }: Props) {
  const isMonth = period.currentView === '月';
  return (
    <section class="think-energy-period-map think-energy-date-map" aria-label={`${period.currentView}精力地图`}>
      <div class="think-energy-period-map__heading"><span>{period.label} · {period.sampledDays}/{period.days.length} 天有记录</span></div>
      <div class="think-energy-date-map__scroll">
        <div class={`think-energy-date-map__chart ${isMonth ? 'is-month' : 'is-week'}`}>
          <div class="think-energy-date-map__axis">
            <div class="think-energy-date-map__axis-head" />
            <div class="think-energy-date-map__axis-track">
              {TIME_TICKS.map((tick) => (
                <span key={tick} style={axisStyle('--think-energy-y', (tick / 1440) * 100)}>
                  {String(Math.floor(tick / 60)).padStart(2, '0')}:00
                </span>
              ))}
            </div>
          </div>
          <div class="think-energy-date-map__days" style={dayCountStyle(period.days.length)}>
            {period.days.map((day) => (
              <div key={day.date} class={`think-energy-date-map__day ${day.sampled ? '' : 'is-missing'}`}>
                <div class="think-energy-date-map__day-head">
                  {!isMonth && <strong>{weekday(day.date)}</strong>}
                  <span>{isMonth ? dayNumber(day.date) : shortDate(day.date)}</span>
                </div>
                <div class="think-energy-date-map__lane">
                  {TIME_TICKS.map((tick) => <i key={tick} class="think-energy-date-map__guide" style={axisStyle('--think-energy-y', (tick / 1440) * 100)} />)}
                  {day.samples.map((sample) => {
                    const visual = sampleVisual(sample);
                    return (
                      <EnergyDot
                        key={sample.id}
                        visual={visual}
                        selected={selectedKey === sample.id}
                        className="think-energy-map-dot"
                        style={energyDotStyle(visual, { '--think-energy-y': `${(sample.minuteOfDay / 1440) * 100}%` })}
                        title={sampleTitle(sample)}
                        onClick={() => onSelect?.({ kind: 'sample', sample })}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div class="think-energy-period-map__hint">实心＝实时 · 空心＝补录 · 5 档尺寸＝精力高低 · Missing 留白</div>
    </section>
  );
}
