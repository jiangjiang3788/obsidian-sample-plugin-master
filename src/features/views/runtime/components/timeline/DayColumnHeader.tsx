// src/features/settings/views/runtime/components/timeline/DayColumnHeader.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { dayjs } from '@core/utils/public';
import { buildDailyGoalHours } from '@core/utils/public';
import { ProgressBlock } from './ProgressBlock';
import type { TaskBlock } from '@core/types/public';
import type { GoalTimeAllocationSummary } from '@core/goal/public';
import { GoalAllocationBlock } from './GoalAllocationBlock';
import type { GoalAllocationTimelineView } from './GoalAllocationBlock';

interface DayColumnHeaderProps {
    day: string;
    blocks: TaskBlock[];
    colorMap: Record<string, string>;
    untrackedLabel: string;
    goalOrder?: string[];
    goalAllocationSummary?: GoalTimeAllocationSummary;
    currentView?: GoalAllocationTimelineView;
}

export function DayColumnHeader({
    day,
    blocks,
    colorMap,
    untrackedLabel,
    goalOrder,
    goalAllocationSummary,
    currentView = '天',
}: DayColumnHeaderProps) {
    const { goalHours, totalDayHours } = useMemo(() => {
        return buildDailyGoalHours(blocks, untrackedLabel);
    }, [blocks, untrackedLabel]);

    return (
        <div class="day-column-header">
            <div class="day-header-title">
                {dayjs(day).format('MM-DD ddd')}
            </div>
            <div class="daily-progress-bar">
                {goalAllocationSummary ? (
                    <GoalAllocationBlock
                        summary={goalAllocationSummary}
                        currentView={currentView}
                        metric="deviation"
                        hideZeroActual
                    />
                ) : (
                    <ProgressBlock
                        goalHours={goalHours}
                        order={goalOrder}
                        totalHours={totalDayHours}
                        colorMap={colorMap}
                        untrackedLabel={untrackedLabel}
                    />
                )}
            </div>
        </div>
    );
}
