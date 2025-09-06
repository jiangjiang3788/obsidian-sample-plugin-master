// src/features/dashboard/ui/TimeNavigator.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { dayjs } from '@core/utils/date';

// 内部工具函数保持不变
const getMonday = (d: dayjs.Dayjs) => d.startOf('isoWeek');
const getWeekNumber = (d: dayjs.Dayjs) => d.isoWeek();
const getWeeksInYear = (year: number) => {
    const date = dayjs().year(year).endOf('year');
    const week = date.isoWeek();
    return week === 1 ? 52 : week;
};
const getMondayByWeek = (year: number, week: number) => dayjs().year(year).isoWeek(week).startOf('isoWeek');
const getWeekRangeStr = (d: dayjs.Dayjs) => `${d.format('MM/DD')}-${d.add(6, 'days').format('MM/DD')}`;

interface TimeNavigatorProps {
    currentDate: dayjs.Dayjs;
    // 回调函数签名保持不变
    onDateChange: (newDate: dayjs.Dayjs, newView: '季' | '月' | '周') => void;
}

export function TimeNavigator({ currentDate, onDateChange }: TimeNavigatorProps) {
    // “今天”的日期信息，用于“当天”描边
    const today = dayjs();
    const todayYear = today.year();
    const todayWeek = getWeekNumber(today);
    const todayMonth = today.month() + 1;
    const todayQuarter = today.quarter();

    // "选中的" 时间点，用于动态判断“过去”和“选中”
    const selectedYear = currentDate.year();
    const selectedWeek = getWeekNumber(currentDate);
    const selectedMonth = currentDate.month() + 1;
    const selectedQuarter = currentDate.quarter();

    const totalWeeksInYear = useMemo(() => getWeeksInYear(selectedYear), [selectedYear]);

    return (
        <div class="time-navigator-container">
            {/* 左侧控制区 */}
            <div class="tn-control-col">
                {/* 年份按钮逻辑不变（跳转到今天） */}
                <div class="tn-cell tn-year-cell" title="点击重置到今天" onClick={() => onDateChange(dayjs(), '周')}>
                    {selectedYear}
                </div>
                <div class="tn-cell tn-nav-buttons">
                    <button title="上一周 (Ctrl+←)" onClick={() => onDateChange(currentDate.subtract(1, 'week'), '周')}>‹</button>
                    <button title="下一周 (Ctrl+→)" onClick={() => onDateChange(currentDate.add(1, 'week'), '周')}>›</button>
                </div>
            </div>

            {/* 右侧主导航区 */}
            <div class="tn-main-col">
                {/* 季度和月份行 */}
                <div class="tn-row tn-row-top">
                    {Array.from({ length: 4 }, (_, i) => i + 1).map(q => {
                        // [修改] “过去”的判断基准严格使用 selected* 变量
                        const isPast = selectedYear > todayYear ? false : (selectedYear < todayYear || (selectedYear === todayYear && q < selectedQuarter));
                        const isTodayContainer = selectedYear === todayYear && q === todayQuarter;
                        const isSelected = q === selectedQuarter;

                        return (
                            <div
                                key={`q${q}`}
                                class={`tn-quarter-block ${isSelected ? 'is-selected' : ''} ${isTodayContainer ? 'is-today' : ''} ${isPast ? 'is-past' : ''}`}
                                onClick={() => onDateChange(dayjs().year(selectedYear).quarter(q).startOf('quarter'), '季')}
                            >
                                <div class={`tn-quarter-header`}>Q{q}</div>
                                <div class="tn-months-container">
                                    {Array.from({ length: 3 }, (_, j) => (q - 1) * 3 + j + 1).map(m => {
                                        // [修改] “过去”的判断基准严格使用 selected* 变量
                                        const isMonthPast = selectedYear > todayYear ? false : (selectedYear < todayYear || (selectedYear === todayYear && m < selectedMonth));
                                        const isMonthToday = selectedYear === todayYear && m === todayMonth;
                                        const isMonthSelected = m === selectedMonth;
                                        return (
                                            <div
                                                key={`m${m}`}
                                                class={`tn-cell tn-month-cell ${isMonthSelected ? 'is-selected' : ''} ${isMonthToday ? 'is-today' : ''} ${isMonthPast ? 'is-past' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); onDateChange(dayjs().year(selectedYear).month(m - 1).startOf('month'), '月'); }}
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
                        const cellMonday = getMondayByWeek(selectedYear, w);

                        // [修改] “过去”的判断基准严格使用 selected* 变量
                        const isPast = cellMonday.isBefore(currentDate, 'week');
                        const isSelected = w === selectedWeek && selectedYear === currentDate.year();
                        const isToday = w === todayWeek && selectedYear === todayYear;

                        const classes = [
                            'tn-cell', 'tn-week-cell',
                            isSelected ? 'is-selected' : '',
                            isToday ? 'is-today' : '',
                            isPast && !isSelected ? 'is-past' : '' // [修改] 过去和选中不再共存
                        ].filter(Boolean).join(' ');

                        return (
                            <div
                                key={w}
                                class={classes}
                                title={`${w}周 (${getWeekRangeStr(cellMonday)})`}
                                onClick={() => onDateChange(cellMonday, '周')}
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