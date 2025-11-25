// src/core/utils/timeNavigator.ts
import { dayjs } from '@core/utils/date';

/**
 * 获取指定日期所在周的周一
 */
export function getMonday(d: dayjs.Dayjs): dayjs.Dayjs {
    return d.startOf('isoWeek');
}

/**
 * 获取指定日期的 ISO 周数
 */
export function getWeekNumber(d: dayjs.Dayjs): number {
    return d.isoWeek();
}

/**
 * 获取指定年份的总周数
 */
export function getWeeksInYear(year: number): number {
    const date = dayjs().year(year).endOf('year');
    const week = date.isoWeek();
    return week === 1 ? 52 : week;
}

/**
 * 根据年份和周数获取该周的周一
 */
export function getMondayByWeek(year: number, week: number): dayjs.Dayjs {
    return dayjs().year(year).isoWeek(week).startOf('isoWeek');
}

/**
 * 获取周范围字符串（MM/DD-MM/DD）
 */
export function getWeekRangeStr(d: dayjs.Dayjs): string {
    return `${d.format('MM/DD')}-${d.add(6, 'days').format('MM/DD')}`;
}
