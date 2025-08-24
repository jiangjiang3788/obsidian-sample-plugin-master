// src/features/dashboard/ui/TimeNavigator.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { dayjs } from '@core/utils/date';

// 内部工具函数
const getMonday = (d: dayjs.Dayjs) => d.startOf('isoWeek');
const getWeekNumber = (d: dayjs.Dayjs) => d.isoWeek();
const getWeeksInYear = (year: number) => {
    const date = dayjs().year(year).endOf('year');
    const week = date.isoWeek();
    // 如果年末的周数是1，说明它属于下一年的第一周，则本年有52周
    return week === 1 ? 52 : week;
};
const getMondayByWeek = (year: number, week: number) => dayjs().year(year).isoWeek(week).startOf('isoWeek');
const getWeekRangeStr = (d: dayjs.Dayjs) => `${d.format('MM/DD')}-${d.add(6, 'days').format('MM/DD')}`;

interface TimeNavigatorProps {
    currentDate: dayjs.Dayjs;
    onDateChange: (newDate: dayjs.Dayjs) => void;
}

export function TimeNavigator({ currentDate, onDateChange }: TimeNavigatorProps) {
    const today = dayjs();
    const year = currentDate.year();
    const selectedWeek = getWeekNumber(currentDate);
    const selectedMonth = currentDate.month() + 1;
    const selectedQuarter = currentDate.quarter();

    const todayYear = today.year();
    const todayWeek = getWeekNumber(today);
    const todayMonth = today.month() + 1;
    const todayQuarter = today.quarter();

    const totalWeeksInYear = useMemo(() => getWeeksInYear(year), [year]);

    // UI 渲染部分
    return (
        <div class="time-navigator-container">
            {/* 左侧控制区 */}
            <div class="tn-control-col">
                <div class="tn-cell tn-year-cell" title="点击重置到今天" onClick={() => onDateChange(dayjs())}>
                    {year}
                </div>
                <div class="tn-cell tn-nav-buttons">
                    <button title="上一周 (Ctrl+←)" onClick={() => onDateChange(currentDate.subtract(1, 'week'))}>‹</button>
                    <button title="下一周 (Ctrl+→)" onClick={() => onDateChange(currentDate.add(1, 'week'))}>›</button>
                </div>
            </div>

            {/* 右侧主导航区 */}
            <div class="tn-main-col">
                {/* 季度和月份行 */}
                <div class="tn-row tn-row-top">
                    {Array.from({ length: 4 }, (_, i) => i + 1).map(q => {
                        const isPast = year < todayYear || (year === todayYear && q < todayQuarter);
                        const isTodayContainer = year === todayYear && q === todayQuarter;
                        const isSelected = q === selectedQuarter;
                        return (
                            <div
                                key={`q${q}`}
                                class={`tn-quarter-block ${isSelected ? 'is-selected' : ''} ${isTodayContainer ? 'is-today' : ''}`}
                                onClick={() => onDateChange(dayjs().year(year).quarter(q).startOf('quarter'))}
                            >
                                <div class={`tn-quarter-header ${isPast ? 'is-past' : ''}`}>Q{q}</div>
                                <div class="tn-months-container">
                                    {Array.from({ length: 3 }, (_, j) => (q - 1) * 3 + j + 1).map(m => {
                                        const isMonthPast = year < todayYear || (year === todayYear && m < todayMonth);
                                        const isMonthToday = year === todayYear && m === todayMonth;
                                        const isMonthSelected = m === selectedMonth;
                                        return (
                                            <div
                                                key={`m${m}`}
                                                class={`tn-cell tn-month-cell ${isMonthSelected ? 'is-selected' : ''} ${isMonthToday ? 'is-today' : ''} ${isMonthPast ? 'is-past' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); onDateChange(dayjs().year(year).month(m - 1).startOf('month')); }}
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

                {/* 周行 */}
                <div class="tn-row tn-weeks-container">
                    {Array.from({ length: totalWeeksInYear }, (_, i) => i + 1).map(w => {
                        const isPast = year < todayYear || (year === todayYear && w < todayWeek);
                        const isToday = year === todayYear && w === todayWeek;
                        const isSelected = w === selectedWeek;
                        const cellMonday = getMondayByWeek(year, w);

                        return (
                            <div
                                key={w}
                                class={`tn-cell tn-week-cell ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''} ${isPast ? 'is-past' : ''}`}
                                title={`${w}周 (${getWeekRangeStr(cellMonday)})`}
                                onClick={() => onDateChange(cellMonday)}
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