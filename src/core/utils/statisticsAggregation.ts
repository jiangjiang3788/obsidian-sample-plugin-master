import type { RecordViewItem } from '@/core/records/RecordEntity';
import { dayjs } from '@core/utils/date';
import { readField } from '@/core/fields/ViewFieldCatalog';
import { getBaseCategory } from '@core/utils/itemGrouping';
import { isSameIsoWeek } from '@core/utils/timelineRange';
import type { CategoryConfig } from '@/core/config/views';

export interface PeriodData {
    counts: Record<string, number>;
    blocks: RecordViewItem[];
}

export type StatisticsBucketAccessor = (item: RecordViewItem) => string;

function defaultBucketAccessor(item: RecordViewItem): string {
    return getBaseCategory(item.categoryKey);
}

function addItemToPeriod(data: PeriodData, categoryOrder: string[], item: RecordViewItem, bucketAccessor?: StatisticsBucketAccessor) {
    const bucketKey = (bucketAccessor || defaultBucketAccessor)(item);
    if (!categoryOrder.includes(bucketKey)) return;
    data.counts[bucketKey]++;
    data.blocks.push(item);
}

/**
 * 创建空的周期数据
 */
export function createPeriodData(categories: CategoryConfig[]): PeriodData {
    return {
        counts: Object.fromEntries(categories.map(c => [c.name, 0])),
        blocks: [],
    };
}

/**
 * 按天聚合数据
 */
export function aggregateByDay(
    items: RecordViewItem[],
    categories: CategoryConfig[],
    targetDate: dayjs.Dayjs,
    bucketAccessor?: StatisticsBucketAccessor
): PeriodData {
    const data = createPeriodData(categories);
    const categoryOrder = categories.map(c => c.name);

    items.forEach(item => {
        const itemDate = dayjs(item.date);
        if (!itemDate.isValid() || !itemDate.isSame(targetDate, 'day')) return;
        addItemToPeriod(data, categoryOrder, item, bucketAccessor);
    });

    return data;
}

/**
 * 按周聚合数据
 */
export function aggregateByWeek(
    items: RecordViewItem[],
    categories: CategoryConfig[],
    targetDate: dayjs.Dayjs,
    usePeriod = false,
    bucketAccessor?: StatisticsBucketAccessor
): PeriodData {
    const data = createPeriodData(categories);
    const categoryOrder = categories.map(c => c.name);
    const weekStart = targetDate.startOf('isoWeek');
    const weekEnd = targetDate.endOf('isoWeek');

    items.forEach(item => {
        const itemDate = dayjs(item.date);
        if (!itemDate.isValid() || !itemDate.isBetween(weekStart, weekEnd, 'day', '[]')) return;

        if (usePeriod) {
            const itemPeriod = (readField(item, 'period') || '').trim();
            const shouldIncludeInWeek = itemPeriod === '' || itemPeriod === '周';
            if (!shouldIncludeInWeek) return;
        }

        addItemToPeriod(data, categoryOrder, item, bucketAccessor);
    });

    return data;
}

/**
 * 按月聚合数据
 */
export function aggregateByMonth(
    items: RecordViewItem[],
    categories: CategoryConfig[],
    targetDate: dayjs.Dayjs,
    usePeriod = false,
    bucketAccessor?: StatisticsBucketAccessor
): PeriodData {
    const data = createPeriodData(categories);
    const categoryOrder = categories.map(c => c.name);

    items.forEach(item => {
        const itemDate = dayjs(item.date);
        if (!itemDate.isValid() || !itemDate.isSame(targetDate, 'month')) return;

        if (usePeriod) {
            const itemPeriod = readField(item, 'period') || '';
            if (itemPeriod !== '月') return;
        }

        addItemToPeriod(data, categoryOrder, item, bucketAccessor);
    });

    return data;
}

/**
 * 按季度聚合数据
 */
export function aggregateByQuarter(
    items: RecordViewItem[],
    categories: CategoryConfig[],
    targetDate: dayjs.Dayjs,
    usePeriod = false,
    bucketAccessor?: StatisticsBucketAccessor
): PeriodData {
    const data = createPeriodData(categories);
    const categoryOrder = categories.map(c => c.name);

    items.forEach(item => {
        const itemDate = dayjs(item.date);
        if (!itemDate.isValid() || !itemDate.isSame(targetDate, 'quarter')) return;

        if (usePeriod) {
            const itemPeriod = readField(item, 'period') || '';
            if (itemPeriod !== '季') return;
        }

        addItemToPeriod(data, categoryOrder, item, bucketAccessor);
    });

    return data;
}

/**
 * 按年聚合数据
 */
export function aggregateByYear(
    items: RecordViewItem[],
    categories: CategoryConfig[],
    targetDate: dayjs.Dayjs,
    usePeriod = false,
    bucketAccessor?: StatisticsBucketAccessor
): PeriodData {
    const data = createPeriodData(categories);
    const categoryOrder = categories.map(c => c.name);

    items.forEach(item => {
        const itemDate = dayjs(item.date);
        if (!itemDate.isValid() || !itemDate.isSame(targetDate, 'year')) return;

        if (usePeriod) {
            const itemPeriod = readField(item, 'period') || '';
            if (itemPeriod !== '年') return;
        }

        addItemToPeriod(data, categoryOrder, item, bucketAccessor);
    });

    return data;
}

/**
 * 获取月份的周数据
 */
export function getMonthWeeksData(
    items: RecordViewItem[],
    categories: CategoryConfig[],
    targetMonth: dayjs.Dayjs,
    usePeriod = false,
    bucketAccessor?: StatisticsBucketAccessor
): PeriodData[] {
    const monthStart = targetMonth.startOf('month');
    const monthEnd = targetMonth.endOf('month');
    const weeksData = [];

    let weekStart = monthStart.startOf('isoWeek');
    while (weekStart.isBefore(monthEnd) || isSameIsoWeek(weekStart, monthEnd)) {
        const weekEnd = weekStart.endOf('isoWeek');
        const weekItems = items.filter(item => {
            const itemDate = dayjs(item.date);
            return itemDate.isBetween(weekStart, weekEnd, 'day', '[]');
        });

        const data = aggregateByWeek(weekItems, categories, weekStart, usePeriod, bucketAccessor);

        weeksData.push(data);
        weekStart = weekStart.add(1, 'week');
    }

    return weeksData;
}
