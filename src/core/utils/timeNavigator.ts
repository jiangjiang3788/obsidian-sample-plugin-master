// src/core/utils/timeNavigator.ts
import { dayjs } from '@core/utils/date';

/**
 * 获取指定日期所在周的周一
 */
export function getMonday(d: dayjs.Dayjs): dayjs.Dayjs {
    return d.startOf('isoWeek');
}




/**
 * 获取周范围字符串（MM/DD-MM/DD）
 */
export function getWeekRangeStr(d: dayjs.Dayjs): string {
    return `${d.format('MM/DD')}-${d.add(6, 'days').format('MM/DD')}`;
}
