/** @jsxImportSource preact */
import { useEffect, useRef, useState } from 'preact/hooks';
import { buildRecordDraftTimeline, type TimelineDraftInput } from '@/core/recordInput/RecordDraftTimeline';
import { buildTimelineScale } from '@core/utils/public';
import { TimeRulerGrid, useTimelineDensityMode } from '@shared/ui/public';

function clock(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(Math.floor(minute % 60)).padStart(2, '0')}`;
}

export function AiBatchTimelinePreview({ records, currentIndex, disabled, onSelect }: {
  records: readonly TimelineDraftInput[];
  currentIndex: number;
  disabled: boolean;
  onSelect: (index: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const densityMode = useTimelineDensityMode(host);
  const [availableHeight, setAvailableHeight] = useState(360);
  const [zoom, setZoom] = useState<number | null>(null);
  const model = buildRecordDraftTimeline(records);
  useEffect(() => {
    const update = () => {
      const element = viewport.current;
      if (!element?.clientHeight) return;
      const headerHeight = element.querySelector<HTMLElement>('.think-ai-timeline__day-header')?.offsetHeight || 28;
      setAvailableHeight(Math.max(60, element.clientHeight - headerHeight - 8));
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    if (viewport.current) observer?.observe(viewport.current);
    return () => observer?.disconnect();
  }, []);
  const hourHeight = zoom ?? Math.min(200, availableHeight * 60 / Math.max(60, model.endMinute - model.startMinute));
  const scale = buildTimelineScale({ hourHeight, startMinute: model.startMinute, endMinute: model.endMinute, densityMode });
  return <div ref={host} className="think-ai-timeline" data-ai-batch-preview="timeline" data-timeline-density={densityMode} data-timeline-tick-step={scale.tickStepMinutes} data-timeline-label-step={scale.labelStepMinutes} data-timeline-grid-step={scale.gridStepMinutes}>
    <div className="think-ai-timeline__toolbar">
      <strong>保存前预览 · {records.length} 条</strong>
      <button type="button" onClick={() => setZoom(null)}>适应高度</button>
      <label>缩放 <input type="range" aria-label="时间轴每小时高度" min="5" max="200" step="5" value={hourHeight}
        onInput={(event) => setZoom(Number(event.currentTarget.value))} /></label>
      <span>标尺 {scale.tickStepMinutes} 分钟 · 网格 {scale.gridStepMinutes} 分钟 · {densityMode === 'compact' ? '紧凑/触屏' : '宽屏'}</span>
    </div>
    <p className="think-ai-timeline__hint">实线为记录区间，虚线为计划。预览不代表已保存；点击条目回到原表单编辑。</p>
    {model.days.length > 0 && <div className="think-ai-timeline__viewport" ref={viewport}>
      <div className="think-ai-timeline__columns">
        <div className="think-ai-timeline__axis-column"><div className="think-ai-timeline__day-header">时间</div>
          <div className="think-ai-timeline__axis" style={{ height: scale.height }}><TimeRulerGrid ticks={scale.ticks} height={scale.height} labels variant="ruler" /></div>
        </div>
        {model.days.map(({ day, entries }) => <section key={day} className="think-ai-timeline__day">
          <div className="think-ai-timeline__day-header">{day}</div>
          <div className="think-ai-timeline__day-body" style={{ height: scale.height }}>
            <TimeRulerGrid ticks={scale.ticks} height={scale.height} variant="grid" />
            {entries.map((entry) => <button type="button" key={`${entry.id}:${entry.startMinute}`}
              className={`think-ai-timeline__block is-${entry.kind}${entry.sourceIndex === currentIndex ? ' is-selected' : ''}`}
              disabled={disabled} onClick={() => onSelect(entry.sourceIndex)}
              data-preview-record-id={entry.id}
              title={`${entry.title} · ${clock(entry.startMinute)}–${clock(entry.endMinute)} · ${entry.kindLabel} · ${entry.status} · ${entry.saveState}`}
              aria-label={`${entry.title} ${entry.status} ${entry.saveState}，打开表单`}
              style={{ top: (entry.startMinute - model.startMinute) * hourHeight / 60,
                height: Math.max(2, (entry.endMinute - entry.startMinute) * hourHeight / 60),
                left: `${entry.lane * 100 / entry.laneCount}%`, width: `${100 / entry.laneCount}%` }}>
              {entry.title} · {entry.status}
            </button>)}
          </div>
        </section>)}
      </div>
    </div>}
    <div className="think-ai-timeline__details" aria-label="完整预览明细，短记录可在这里选择">
      {model.days.map(({ day, entries }) => <section key={day}><strong>{day}</strong>
        {entries.map((entry) => <button type="button" key={`${entry.id}:${entry.startMinute}`} disabled={disabled} onClick={() => onSelect(entry.sourceIndex)}>
          <span>{clock(entry.startMinute)}{entry.endMinute !== entry.startMinute ? `–${clock(entry.endMinute)}` : '（时点）'} · {entry.title}</span>
          <small>{entry.kindLabel} · {entry.status} · {entry.saveState}</small>
        </button>)}
      </section>)}
      {model.unplaced.length > 0 && <section data-preview-unplaced="true"><strong>未定位到时间轴 · {model.unplaced.length} 条</strong>
        {model.unplaced.map((entry) => <button type="button" key={entry.id} disabled={disabled} onClick={() => onSelect(entry.sourceIndex)}>
          <span>{entry.title} · {entry.status} · {entry.saveState}</span><small>{entry.reason}</small>
        </button>)}
      </section>}
    </div>
  </div>;
}
