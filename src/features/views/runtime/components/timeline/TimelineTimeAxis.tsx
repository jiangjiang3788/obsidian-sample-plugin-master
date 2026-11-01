/** @jsxImportSource preact */
import type { TargetedMouseEvent } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { timelineOffsetFromMinute, buildTimelineScale, type TimelineScale } from '@core/utils/public';
import { TimeRulerGrid } from '@shared/ui/public';
import type { TimelineTimeAxisRowModel } from '../../TimelineView/TimelineDailyViewModel';

interface TimelineTimeAxisProps {
  rows: TimelineTimeAxisRowModel[];
  scale?: TimelineScale;
  width: number;
  hourHeight: number;
  maxHours: number;
  maxHourHeight?: number;
  onZoomToMax?: () => void;
}

export function TimelineTimeAxis({
  scale,
  width,
  hourHeight,
  maxHours,
  maxHourHeight,
  onZoomToMax,
}: TimelineTimeAxisProps) {
  const grid = scale ?? buildTimelineScale({ hourHeight, maxHours });
  const currentTimeAnchorRef = useRef<HTMLDivElement | null>(null);
  const pendingCurrentTimeFocusRef = useRef(false);
  const effectiveMaxHourHeight = maxHourHeight ?? hourHeight;
  const now = new Date();
  const currentMinute = Math.min(
    maxHours * 60,
    now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60,
  );

  const scrollCurrentTimeIntoView = () => {
    const anchor = currentTimeAnchorRef.current;
    const viewport = anchor?.closest<HTMLElement>('.timeline-view-wrapper');
    if (!anchor || !viewport) return;
    // scrollIntoView() scrolls *all* scrollable ancestors in some WebViews,
    // moving the Obsidian dashboard or horizontal date columns as a side effect.
    // Scroll only the owning timeline viewport and only on the Y axis.
    const position = anchor.getBoundingClientRect().top
      - viewport.getBoundingClientRect().top + viewport.scrollTop;
    const maxTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    viewport.scrollTop = Math.min(maxTop, Math.max(0, position - viewport.clientHeight / 2));
  };

  useEffect(() => {
    if (!pendingCurrentTimeFocusRef.current || hourHeight < effectiveMaxHourHeight) return;
    pendingCurrentTimeFocusRef.current = false;
    scrollCurrentTimeIntoView();
  }, [hourHeight, effectiveMaxHourHeight]);

  const handleDoubleClick = (event: TargetedMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    pendingCurrentTimeFocusRef.current = true;
    if (!onZoomToMax || hourHeight >= effectiveMaxHourHeight) {
      pendingCurrentTimeFocusRef.current = false;
      scrollCurrentTimeIntoView();
      return;
    }
    onZoomToMax();
  };

  return (
    <div
      class="time-axis"
      style={`flex:0 0 var(--timeline-time-axis-width, ${width}px);height:${grid.height}px;`}
      title="双击：最大缩放并定位到当前时间"
      onDblClick={handleDoubleClick}
    >
      <div
        ref={currentTimeAnchorRef}
        class="timeline-current-time-scroll-anchor"
        aria-hidden="true"
        style={`top:${timelineOffsetFromMinute(currentMinute, hourHeight)}px;`}
      />
      <TimeRulerGrid ticks={grid.ticks} height={grid.height} labels variant="ruler" />
    </div>
  );
}
