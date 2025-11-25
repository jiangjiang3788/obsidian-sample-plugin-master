// src/shared/ui/timeline/DayColumnHeader.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { dayjs } from '@core/utils/date';
import { buildDailyCategoryHours } from '@core/utils/timelineAggregation';
import { ProgressBlock } from './ProgressBlock';
import { TaskBlock } from '@features/views/timeline-parser';

interface DayColumnHeaderProps {
    day: string;
    blocks: TaskBlock[];
    categoriesConfig: Record<string, { files?: string[]; color?: string }>;
    colorMap: Record<string, string>;
    untrackedLabel: string;
    progressOrder?: string[];
}

export function DayColumnHeader({ 
    day, 
    blocks, 
    categoriesConfig, 
    colorMap, 
    untrackedLabel, 
    progressOrder 
}: DayColumnHeaderProps) {
    const { categoryHours, totalDayHours } = useMemo(() => {
        return buildDailyCategoryHours(blocks, categoriesConfig, untrackedLabel);
    }, [blocks, categoriesConfig, untrackedLabel]);
    
    return (
        <div class="day-column-header">
            <div class="day-header-title">
                {dayjs(day).format('MM-DD ddd')}
            </div>
            <div class="daily-progress-bar">
                <ProgressBlock 
                    categoryHours={categoryHours} 
                    order={progressOrder} 
                    totalHours={totalDayHours} 
                    colorMap={colorMap} 
                    untrackedLabel={untrackedLabel} 
                />
            </div>
        </div>
    );
}
