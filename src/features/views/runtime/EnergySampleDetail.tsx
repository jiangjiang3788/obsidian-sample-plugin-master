/** @jsxImportSource preact */
import { h } from 'preact';
import type { JSX } from 'preact';
import { classifyEnergyActivity, type EnergyManagementModel } from '@core/energy/public';
import type { RecordViewItem } from '@core/types/public';
import type { OpenRecordOriginHandler } from '@shared/types/public';
import { createRecordGestureHandlers, RECORD_GESTURE_HINT } from '@shared/ui/public';
import type { EnergyMapSelection } from './EnergyMapTypes';

interface Props {
  selection?: EnergyMapSelection | null;
  management?: EnergyManagementModel | null;
  onBack?: () => void;
  onOpenRecord?: (item: RecordViewItem) => void;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
}


function RecordAction({ item, label, className = 'think-energy-detail__open', onOpenRecord, onOpenRecordOrigin }: {
  item: RecordViewItem;
  label: string;
  className?: string;
  onOpenRecord?: (item: RecordViewItem) => void;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
}) {
  const gesture = createRecordGestureHandlers({
    item,
    onPrimary: () => void onOpenRecord?.(item),
    onOpenOrigin: onOpenRecordOrigin,
  });
  return (
    <button
      type="button"
      class={className}
      title={RECORD_GESTURE_HINT}
      onClick={gesture.onClick}
      onDblClick={gesture.onDblClick}
      onTouchEnd={gesture.onTouchEnd}
      onKeyDown={gesture.onKeyDown}
    >{label}</button>
  );
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

function SampleDetail({ selection, management, onBack, onOpenRecord, onOpenRecordOrigin }: Props & { selection: Extract<EnergyMapSelection, { kind: 'sample' }> }) {
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
      {onOpenRecord && <RecordAction item={point.item} label="打开记录 →" onOpenRecord={onOpenRecord} onOpenRecordOrigin={onOpenRecordOrigin} />}
    </aside>
  );
}

function DayDetail({ selection, onBack, onOpenRecord, onOpenRecordOrigin }: Props & { selection: Extract<EnergyMapSelection, { kind: 'day' }> }) {
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
        {day.samples.map((sample) => <RecordAction key={sample.id} item={sample.item} label={`${sample.time}　综合 ${sample.score}`} className="think-energy-detail__record-row" onOpenRecord={onOpenRecord} onOpenRecordOrigin={onOpenRecordOrigin} />)}
      </div>
      {latest && onOpenRecord && <RecordAction item={latest.item} label="打开最后一条记录 →" onOpenRecord={onOpenRecord} onOpenRecordOrigin={onOpenRecordOrigin} />}
    </aside>
  );
}

export function EnergySampleDetail(props: Props) {
  if (!props.selection) return null;
  if (props.selection.kind === 'day') return <DayDetail {...props} selection={props.selection} />;
  return <SampleDetail {...props} selection={props.selection} />;
}
