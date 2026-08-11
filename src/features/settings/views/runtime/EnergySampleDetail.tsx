/** @jsxImportSource preact */
import { h } from 'preact';
import type { JSX } from 'preact';
import { classifyEnergyActivity, type EnergyManagementModel } from '@core/energy/public';
import type { Item } from '@core/types/public';
import type { EnergyMapSelection } from './EnergyMapTypes';

interface Props {
  selection?: EnergyMapSelection | null;
  management?: EnergyManagementModel | null;
  onBack?: () => void;
  onOpenRecord?: (item: Item) => void;
}

function barStyle(value?: number): JSX.CSSProperties {
  return { '--think-energy-detail-value': `${Math.max(0, Math.min(100, value ?? 0))}%` } as JSX.CSSProperties;
}

function signalsText(selection: Extract<EnergyMapSelection, { kind: 'sample' }>): string {
  const signals = selection.sample.context?.dailySignals || [];
  return signals.map((signal) => `${signal.label}${signal.value != null ? ` ${signal.value}` : ''}`).join(' · ');
}

function impactText(selection: Extract<EnergyMapSelection, { kind: 'sample' }>, management?: EnergyManagementModel | null): string | null {
  const activity = selection.sample.context?.activity;
  if (!activity) return null;
  const label = classifyEnergyActivity(activity.item);
  const candidate = [...(management?.recoveryCandidates || []), ...(management?.cautionCandidates || [])]
    .find((row) => row.label === label);
  if (!candidate) return null;
  const delta = Math.round(candidate.meanDelta);
  return `${label} · 预计 ${delta > 0 ? '+' : ''}${delta}`;
}

function SampleDetail({ selection, management, onBack, onOpenRecord }: Props & { selection: Extract<EnergyMapSelection, { kind: 'sample' }> }) {
  const point = selection.sample;
  const activity = point.context?.activity;
  const signals = signalsText(selection);
  const impact = impactText(selection, management);
  return (
    <aside class="think-energy-detail" aria-label="精力记录详情">
      <button type="button" class="think-energy-detail__back" onClick={onBack}>‹ 返回本周期</button>
      <div class="think-energy-detail__head">
        <div><strong>{point.date}</strong><span>{point.time}</span></div>
        <span class={`think-energy-detail__mode ${point.captureMode === 'retrospective' ? 'is-retrospective' : ''}`}>{point.captureMode === 'retrospective' ? '补录' : '实时'}</span>
      </div>

      <div class="think-energy-detail__total"><strong>{point.score}</strong><span>综合</span></div>
      {(point.brainScore != null || point.physicalScore != null) && (
        <div class="think-energy-detail__bars">
          {point.brainScore != null && <div title={`脑力 ${point.brainScore}`}><span>脑力</span><i style={barStyle(point.brainScore)}><b /></i></div>}
          {point.physicalScore != null && <div title={`体力 ${point.physicalScore}`}><span>体力</span><i style={barStyle(point.physicalScore)}><b /></i></div>}
        </div>
      )}

      <div class="think-energy-detail__section">
        <strong>当时</strong>
        {activity ? <p>前后活动　{activity.title}{activity.durationMinutes ? ` · ${activity.durationMinutes}min` : ''}</p> : <p>附近没有可靠活动</p>}
        {signals && <p>当天　　　{signals}</p>}
      </div>

      {impact && <div class="think-energy-detail__impact"><span>活动影响</span><strong>{impact}</strong></div>}
      {onOpenRecord && <button type="button" class="think-energy-detail__open" onClick={() => onOpenRecord(point.item)}>打开原记录 →</button>}
    </aside>
  );
}

function DayDetail({ selection, onBack, onOpenRecord }: Props & { selection: Extract<EnergyMapSelection, { kind: 'day' }> }) {
  const { day } = selection;
  const latest = day.samples[day.samples.length - 1];
  return (
    <aside class="think-energy-detail" aria-label="每日精力详情">
      <button type="button" class="think-energy-detail__back" onClick={onBack}>‹ 返回本周期</button>
      <div class="think-energy-detail__head"><div><strong>{day.date}</strong><span>{day.samples.length} 次记录</span></div></div>
      <div class="think-energy-detail__total"><strong>{day.dailyScore ?? '—'}</strong><span>当日平均</span></div>
      {(day.dailyBrainScore != null || day.dailyPhysicalScore != null) && (
        <div class="think-energy-detail__bars">
          {day.dailyBrainScore != null && <div title={`脑力日均 ${day.dailyBrainScore}`}><span>脑力</span><i style={barStyle(day.dailyBrainScore)}><b /></i></div>}
          {day.dailyPhysicalScore != null && <div title={`体力日均 ${day.dailyPhysicalScore}`}><span>体力</span><i style={barStyle(day.dailyPhysicalScore)}><b /></i></div>}
        </div>
      )}
      <div class="think-energy-detail__section">
        <strong>当天记录</strong>
        {day.samples.map((sample) => <p key={sample.id}>{sample.time}　综合 {sample.score}</p>)}
      </div>
      {latest && onOpenRecord && <button type="button" class="think-energy-detail__open" onClick={() => onOpenRecord(latest.item)}>打开最后一条记录 →</button>}
    </aside>
  );
}

export function EnergySampleDetail(props: Props) {
  if (!props.selection) return null;
  if (props.selection.kind === 'day') return <DayDetail {...props} selection={props.selection} />;
  return <SampleDetail {...props} selection={props.selection} />;
}
