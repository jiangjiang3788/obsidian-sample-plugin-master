/** @jsxImportSource preact */
import { h } from 'preact';
import type { GoalTimeAllocationSummary } from '@core/goal/public';
import { GoalAllocationBlock } from './GoalAllocationBlock';
import type { GoalAllocationTimelineView } from './GoalAllocationBlock';
import { ProgressBlock } from './ProgressBlock';

export function TimelineOverallSummary(props: {
  width: number;
  goalSummary?: GoalTimeAllocationSummary | null;
  currentView: GoalAllocationTimelineView;
  categoryHours: Record<string, number>;
  totalHours: number;
  progressOrder: string[];
  colorMap: Record<string, string>;
  untrackedLabel: string;
}) {
  const { width, goalSummary, currentView, categoryHours, totalHours, progressOrder, colorMap, untrackedLabel } = props;
  const containerStyle = { flex: `0 0 ${width}px` };
  return (
    <div class="summary-progress-container" style={containerStyle}>
      <div class="summary-title" title={goalSummary ? '实际时间只统计 TaskSession；悬浮每一行查看目标时间、实际时间和子目标明细。' : undefined}>
        总结
      </div>
      <div class="summary-content">
        {goalSummary ? (
          <GoalAllocationBlock summary={goalSummary} currentView={currentView} metric="deviation" />
        ) : totalHours > 0 ? (
          <ProgressBlock categoryHours={categoryHours} order={progressOrder} totalHours={totalHours} colorMap={colorMap} untrackedLabel={untrackedLabel} />
        ) : null}
      </div>
    </div>
  );
}
