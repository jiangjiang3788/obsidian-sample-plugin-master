// src/features/views/TimeNavigator.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { dayjs } from '@core/public';
import {
    buildTimeNavigatorCellClass,
    buildTimeNavigatorMonthTarget,
    buildTimeNavigatorQuarterBlocks,
    buildTimeNavigatorQuarterTarget,
    buildTimeNavigatorSelection,
    buildTimeNavigatorWeekCells,
    buildTimeNavigatorYearTarget,
} from './TimeNavigatorModel';

interface TimeNavigatorProps {
    currentDate: dayjs.Dayjs;
    onDateChange: (newDate: dayjs.Dayjs, newView: '年' | '季' | '月' | '周') => void;
}

export function TimeNavigator({ currentDate, onDateChange }: TimeNavigatorProps) {
    const selection = useMemo(() => buildTimeNavigatorSelection(currentDate), [currentDate]);
    const quarterBlocks = useMemo(() => buildTimeNavigatorQuarterBlocks(selection), [selection.selectedQuarter, selection.selectedMonth]);
    const weekCells = useMemo(() => buildTimeNavigatorWeekCells(selection), [selection]);

    return (
        <div class="time-navigator-container">
            <div class="tn-control-col">
                <div
                    class="tn-cell tn-year-cell"
                    title="单击选择全年 / 双击返回本周"
                    onClick={() => onDateChange(buildTimeNavigatorYearTarget(selection.selectedYear), '年')}
                    onDblClick={(e: MouseEvent) => {
                        e.stopPropagation();
                        onDateChange(dayjs(), '周');
                    }}
                >
                    {selection.selectedYear}
                </div>
                <div class="tn-cell tn-nav-buttons">
                    <button title="上一周 (Ctrl+←)" onClick={() => onDateChange(currentDate.subtract(1, 'week'), '周')}>‹</button>
                    <button title="下一周 (Ctrl+→)" onClick={() => onDateChange(currentDate.add(1, 'week'), '周')}>›</button>
                </div>
            </div>

            <div class="tn-main-col">
                <div class="tn-row tn-row-top">
                    {quarterBlocks.map((quarterBlock) => (
                        <div
                            key={`q${quarterBlock.quarter}`}
                            class={buildTimeNavigatorCellClass('tn-quarter-block', [
                                [quarterBlock.isSelected, 'is-selected'],
                                [quarterBlock.isBeforeSelection, 'is-before-selection'],
                            ])}
                            onClick={() => onDateChange(buildTimeNavigatorQuarterTarget(selection.selectedYear, quarterBlock.quarter), '季')}
                        >
                            <div class="tn-quarter-header">Q{quarterBlock.quarter}</div>
                            <div class="tn-months-container">
                                {quarterBlock.months.map((monthCell) => (
                                    <div
                                        key={`m${monthCell.month}`}
                                        class={buildTimeNavigatorCellClass('tn-cell tn-month-cell', [
                                            [monthCell.isSelected, 'is-selected'],
                                            [monthCell.isBeforeSelection, 'is-before-selection'],
                                        ])}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDateChange(buildTimeNavigatorMonthTarget(selection.selectedYear, monthCell.month), '月');
                                        }}
                                    >
                                        {monthCell.month}月
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div class="tn-row tn-weeks-container">
                    {weekCells.map((weekCell) => (
                        <div
                            key={weekCell.week}
                            class={weekCell.className}
                            title={weekCell.title}
                            onClick={() => onDateChange(weekCell.endOfWeek, '周')}
                        >
                            {weekCell.week}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
