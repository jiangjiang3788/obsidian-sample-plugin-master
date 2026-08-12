/** @jsxImportSource preact */
import { h } from 'preact';
import type { EnergyPeriodDayModel, EnergyPeriodRenderModel } from '../models/energyViewModel';
import { EnergyDot } from './EnergyDot';
import { buildEnergyDotVisual, energyDotStyle } from './EnergyVisualEncoding';
import type { EnergyMapSelection } from './EnergyMapTypes';

interface Props {
  period: EnergyPeriodRenderModel;
  selectedKey?: string | null;
  onSelect?: (selection: EnergyMapSelection) => void;
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function monthLabel(key: string): string {
  return `${Number(key.slice(5, 7))}月`;
}

function mondayIndex(date: string): number {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return 0;
  return (parsed.getDay() + 6) % 7;
}

function dayCaptureMode(day: EnergyPeriodDayModel): 'realtime' | 'retrospective' {
  // A daily aggregate is solid when the day contains at least one realtime observation.
  // It is hollow only when every observation for the day was retrospective.
  return day.samples.length > 0 && day.samples.every((sample) => sample.captureMode === 'retrospective')
    ? 'retrospective'
    : 'realtime';
}

function dayCaptureLabel(day: EnergyPeriodDayModel): string {
  const retrospective = day.samples.filter((sample) => sample.captureMode === 'retrospective').length;
  if (retrospective === day.samples.length) return '仅补录';
  if (retrospective > 0) return `含 ${retrospective} 次补录`;
  return '实时';
}

export function EnergyCalendarMap({ period, selectedKey, onSelect }: Props) {
  const months = new Map<string, EnergyPeriodDayModel[]>();
  for (const day of period.days) {
    const key = monthKey(day.date);
    const rows = months.get(key) || [];
    rows.push(day);
    months.set(key, rows);
  }

  return (
    <section class="think-energy-period-map think-energy-daily-dots" aria-label={`${period.currentView}每日精力`}>
      <div class="think-energy-period-map__heading"><span>{period.label} · 一天一个点</span></div>
      <div class={`think-energy-daily-dots__months is-${period.currentView === '年' ? 'year' : 'quarter'}`}>
        {[...months.entries()].map(([key, days]) => {
          const blanks = days.length ? mondayIndex(days[0].date) : 0;
          return (
            <div class="think-energy-daily-dots__month" key={key}>
              <strong>{monthLabel(key)}</strong>
              <div class="think-energy-daily-dots__weekdays"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div>
              <div class="think-energy-daily-dots__grid">
                {Array.from({ length: blanks }).map((_, index) => <i key={`blank-${index}`} />)}
                {days.map((day) => {
                  const score = day.dailyScore;
                  const keyValue = `day:${day.date}`;
                  if (score == null) return <div key={day.date} class="think-energy-daily-dot-cell is-missing" />;
                  const visual = buildEnergyDotVisual({ score, capture: dayCaptureMode(day), density: 'calendar' });
                  return (
                    <div key={day.date} class="think-energy-daily-dot-cell">
                      <EnergyDot
                        visual={visual}
                        cell
                        selected={selectedKey === keyValue}
                        className="think-energy-daily-dot"
                        style={energyDotStyle(visual)}
                        title={`${day.date} · 日均 ${score} · ${day.samples.length} 次 · ${dayCaptureLabel(day)}`}
                        onClick={() => onSelect?.({ kind: 'day', day })}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div class="think-energy-period-map__hint">实心＝当天含实时记录 · 空心＝当天仅补录 · 5 档尺寸＝日均精力 · Missing 留白</div>
    </section>
  );
}
