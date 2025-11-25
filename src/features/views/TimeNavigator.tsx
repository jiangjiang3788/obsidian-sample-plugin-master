// src/features/views/TimeNavigator.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { dayjs } from '@core/utils/date';
import { 
    getMonday, 
    getWeekNumber, 
    getWeeksInYear, 
    getMondayByWeek, 
    getWeekRangeStr 
} from '@core/utils/timeNavigator';

interface TimeNavigatorProps {
    currentDate: dayjs.Dayjs;
    // 允许 onDateChange 接收 '年' 周期
    onDateChange: (newDate: dayjs.Dayjs, newView: '年' | '季' | '月' | '周') => void;
}

export function TimeNavigator({ currentDate, onDateChange }: TimeNavigatorProps) {
    const today = dayjs();
    const todayYear = today.year();
    const todayWeek = getWeekNumber(today);

    const selectedYear = currentDate.year();
    const selectedWeek = getWeekNumber(currentDate);
    const selectedMonth = currentDate.month() + 1;
    const selectedQuarter = currentDate.quarter();

    const totalWeeksInYear = useMemo(() => getWeeksInYear(selectedYear), [selectedYear]);

    return (
        <div class="time-navigator-container">
            <div class="tn-control-col">
                {/* 年份按钮增加单击和双击事件 */}
                <div 
                    class="tn-cell tn-year-cell" 
                    title="单击选择全年 / 双击返回本周" 
                    onClick={() => onDateChange(dayjs().year(selectedYear).endOf('year'), '年')}
                    onDblClick={(e: MouseEvent) => {
                        e.stopPropagation();
                        onDateChange(dayjs(), '周');
                    }}
                >
                    {selectedYear}
                </div>
                <div class="tn-cell tn-nav-buttons">
                    <button title="上一周 (Ctrl+←)" onClick={() => onDateChange(currentDate.subtract(1, 'week'), '周')}>‹</button>
                    <button title="下一周 (Ctrl+→)" onClick={() => onDateChange(currentDate.add(1, 'week'), '周')}>›</button>
                </div>
            </div>

            <div class="tn-main-col">
                <div class="tn-row tn-row-top">
                    {Array.from({ length: 4 }, (_, i) => i + 1).map(q => {
                        const isSelected = q <= selectedQuarter;
                        const isBeforeSelection = q < selectedQuarter;

                        return (
                            <div
                                key={`q${q}`}
                                class={`tn-quarter-block ${isSelected ? 'is-selected' : ''} ${isBeforeSelection ? 'is-before-selection' : ''}`}
                                onClick={() => onDateChange(dayjs().year(selectedYear).quarter(q).endOf('quarter'), '季')}
                            >
                                <div class={`tn-quarter-header`}>Q{q}</div>
                                <div class="tn-months-container">
                                    {Array.from({ length: 3 }, (_, j) => (q - 1) * 3 + j + 1).map(m => {
                                        const isMonthSelected = m <= selectedMonth;
                                        const isMonthBeforeSelection = m < selectedMonth;

                                        return (
                                            <div
                                                key={`m${m}`}
                                                class={`tn-cell tn-month-cell ${isMonthSelected ? 'is-selected' : ''} ${isMonthBeforeSelection ? 'is-before-selection' : ''}`}
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    onDateChange(dayjs().year(selectedYear).month(m - 1).endOf('month'), '月'); 
                                                }}
                                            >
                                                {m}月
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div class="tn-row tn-weeks-container">
                    {Array.from({ length: totalWeeksInYear }, (_, i) => i + 1).map(w => {
                        const cellMonday = getMondayByWeek(selectedYear, w);
                        
                        const isSelected = w <= selectedWeek;
                        const isToday = selectedYear === todayYear && w === todayWeek;
                        const isBeforeSelection = w < selectedWeek;

                        const classes = [
                            'tn-cell', 'tn-week-cell',
                            isSelected ? 'is-selected' : '',
                            isToday ? 'is-today' : '',
                            isBeforeSelection && !isSelected ? 'is-before-selection' : ''
                        ].filter(Boolean).join(' ');

                        return (
                            <div
                                key={w}
                                class={classes}
                                title={`${w}周 (${getWeekRangeStr(cellMonday)})`}
                                // [核心修复] 使用周日作为日期基准，确保年份和月份上下文正确
                                onClick={() => onDateChange(cellMonday.endOf('isoWeek'), '周')}
                            >
                                {w}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
