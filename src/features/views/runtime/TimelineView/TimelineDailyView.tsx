/** @jsxImportSource preact */
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { buildTimelineScale } from '@core/utils/public';
import { attachTimelineViewportInteractions, useTimelineDensityMode, TimelineTouchScope, TimelineTouchScopeContext } from '@shared/ui/public';
import type { OpenRecordHandler, OpenRecordOriginHandler, UpdateTimelineRangeHandler } from '@shared/types/public';
import type { GoalTimeAllocationSummary } from '@core/goal/public';
import { DayColumnHeader, DayColumnBody, TimelineOverallSummary, TimelineTimeAxis } from '../components/timeline';
import type { DailyViewData } from './TimelineViewTypes';
import { buildTimelineDayColumns, buildTimelineTimeAxisRows } from './TimelineDailyViewModel';
import type { TimelineCurrentView } from './TimelineViewModel';
type ZoomHandlers = Record<string, any>;
interface TimelineDailyViewProps {
  zoomHandlers: ZoomHandlers;
  onZoomToMax?: () => void;
  maxHourHeight?: number;
  timeAxisWidth: number;
  summaryGoalHours: Record<string, number>;
  totalSummaryHours: number;
  goalAllocationSummary?: GoalTimeAllocationSummary | null;
  goalAllocationByDay?: Record<string, GoalTimeAllocationSummary>;
  currentView?: TimelineCurrentView;
  dailyViewData: DailyViewData;
  hourHeight: number;
  maxHours: number;
  colorMap: Record<string, string>;
  goalOrder: string[];
  untrackedLabel: string;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  onUpdateTimelineRange?: UpdateTimelineRangeHandler;
  onOpenRecord?: OpenRecordHandler;
  onNotice?: (message: string) => void;
  onColumnClick: (day: string, e: MouseEvent | TouchEvent, selectedRange?: { startMinute: number; endMinute: number } | null) => void;
}

export function TimelineDailyView({
  zoomHandlers,
  onZoomToMax,
  maxHourHeight,
  timeAxisWidth,
  summaryGoalHours,
  totalSummaryHours,
  goalAllocationSummary = null,
  goalAllocationByDay = {},
  currentView = '天',
  dailyViewData,
  hourHeight,
  maxHours,
  colorMap,
  goalOrder,
  untrackedLabel,
  onOpenRecordOrigin,
  onUpdateTimelineRange,
  onOpenRecord,
  onNotice,
  onColumnClick,
}: TimelineDailyViewProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  // One selected block per timeline, not one permanent edit flag per block.
  const [selectedBlockKey, setSelectedBlockKey] = useState<string | null>(null);
  const scopeRef = useRef<TimelineTouchScope | null>(null);
  if (!scopeRef.current) scopeRef.current = new TimelineTouchScope();
  const detachViewportRef = useRef<(() => void) | null>(null);
  const bindPinch = zoomHandlers.bindTouchSurface;
  const setHostRef = useCallback((node: HTMLDivElement | null) => {
    if (hostRef.current === node) return;
    detachViewportRef.current?.();
    detachViewportRef.current = null;
    hostRef.current = node;
    if (node) {
      detachViewportRef.current = attachTimelineViewportInteractions(node, {
        isTimeEditing: () => scopeRef.current?.hasArmedEdit() ?? false,
        requestPinch: () => scopeRef.current?.requestPinch() ?? true,
        bindPinch,
      });
    }
  }, [bindPinch]);
  useEffect(() => () => { detachViewportRef.current?.(); }, []);
  const densityMode = useTimelineDensityMode(hostRef);
  const scale = buildTimelineScale({ hourHeight, maxHours, densityMode });
  const dayColumns = buildTimelineDayColumns(dailyViewData);
  const timeAxisRows = buildTimelineTimeAxisRows(maxHours, hourHeight);
  return (
    <TimelineTouchScopeContext.Provider value={scopeRef.current}>
    <div
      class="timeline-view-wrapper think-viz-surface"
      ref={setHostRef}
      onContextMenu={(event) => {
        // Block the iOS text-selection/copy callout only on coarse touch devices.
        // Mouse users keep the desktop right-click context menu.
        if (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) {
          event.preventDefault();
        }
      }}
      onWheel={zoomHandlers.onWheel}
    >
      <div class="timeline-sticky-header">
        <TimelineOverallSummary
          width={timeAxisWidth}
          goalSummary={goalAllocationSummary}
          currentView={currentView}
          goalHours={summaryGoalHours}
          totalHours={totalSummaryHours}
          goalOrder={goalOrder}
          colorMap={colorMap}
          untrackedLabel={untrackedLabel}
        />

        {dayColumns.map(({ day, blocks }) => (
          <DayColumnHeader
            key={day}
            day={day}
            blocks={blocks.filter((block) => block.timelineSource !== 'task-plan')}
            colorMap={colorMap}
            untrackedLabel={untrackedLabel}
            goalOrder={goalOrder}
            goalAllocationSummary={goalAllocationByDay[day]}
            currentView={currentView}
          />
        ))}
      </div>

      <div class="timeline-scrollable-body">
        <TimelineTimeAxis
          rows={timeAxisRows}
          scale={scale}
          width={timeAxisWidth}
          hourHeight={hourHeight}
          maxHours={maxHours}
          maxHourHeight={maxHourHeight}
          onZoomToMax={onZoomToMax}
        />

        {dayColumns.map(({ day, blocks }) => (
          <DayColumnBody
            key={day}
            onOpenRecordOrigin={onOpenRecordOrigin}
            selectedBlockKey={selectedBlockKey}
            onSelectBlock={setSelectedBlockKey}
            day={day}
            blocks={blocks}
            scale={scale}
            hourHeight={hourHeight}
            colorMap={colorMap}
            maxHours={maxHours}
            onUpdateTimelineRange={onUpdateTimelineRange}
            onOpenRecord={onOpenRecord}
            onNotice={onNotice}
            onColumnClick={onColumnClick}
          />
        ))}
      </div>
    </div>
    </TimelineTouchScopeContext.Provider>
  );
}
