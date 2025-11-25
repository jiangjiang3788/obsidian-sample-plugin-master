import type { Item } from '@/core/types/schema';
import { dayjs } from '@core/utils/date';
import { readField } from '@/core/types/schema';
import { getBaseCategory } from '@core/utils/itemGrouping';

export interface PeriodData {
    counts: Record<string, number>;
    blocks: Item[];
}

export interface CategoryConfig {
    name: string;
    color?: string;
    alias?: string;
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
    items: Item[], 
    categories: CategoryConfig[], 
    targetDate: dayjs.Dayjs
): PeriodData {
    const data = createPeriodData(categories);
    const categoryOrder = categories.map(c => c.name);
    
    items.forEach(item => {
        const itemDate = dayjs(item.date);
        if (!itemDate.isValid() || !itemDate.isSame(targetDate, 'day')) return;
        
        const baseCategory = getBaseCategory(item.categoryKey);
        if (!categoryOrder.includes(baseCategory)) return;
        
        data.counts[baseCategory]++;
        data.blocks.push(item);
    });
    
    return data;
}

/**
 * 按周聚合数据
 */
export function aggregateByWeek(
    items: Item[], 
    categories: CategoryConfig[], 
    targetDate: dayjs.Dayjs
): PeriodData {
    const data = createPeriodData(categories);
    const categoryOrder = categories.map(c => c.name);
    const weekStart = targetDate.startOf('isoWeek');
    const weekEnd = targetDate.endOf('isoWeek');
    
    items.forEach(item => {
        const itemDate = dayjs(item.date);
        if (!itemDate.isValid() || !itemDate.isBetween(weekStart, weekEnd, 'day', '[]')) return;
        
        const baseCategory = getBaseCategory(item.categoryKey);
        if (!categoryOrder.includes(baseCategory)) return;
        
        data.counts[baseCategory]++;
        data.blocks.push(item);
    });
    
    return data;
}

/**
 * 按月聚合数据
 */
export function aggregateByMonth(
    items: Item[], 
    categories: CategoryConfig[], 
    targetDate: dayjs.Dayjs,
    usePeriod = false
): PeriodData {
    const data = createPeriodData(categories);
    const categoryOrder = categories.map(c => c.name);
    
    items.forEach(item => {
        const itemDate = dayjs(item.date);
        if (!itemDate.isValid() || !itemDate.isSame(targetDate, 'month')) return;
        
        const baseCategory = getBaseCategory(item.categoryKey);
        if (!categoryOrder.includes(baseCategory)) return;
        
        if (usePeriod) {
            const itemPeriod = readField(item, 'period') || '';
            if (itemPeriod === '月') {
                data.counts[baseCategory]++;
                data.blocks.push(item);
            }
        } else {
            data.counts[baseCategory]++;
            data.blocks.push(item);
        }
    });
    
    return data;
}

/**
 * 按季度聚合数据
 */
export function aggregateByQuarter(
    items: Item[], 
    categories: CategoryConfig[], 
    targetDate: dayjs.Dayjs,
    usePeriod = false
): PeriodData {
    const data = createPeriodData(categories);
    const categoryOrder = categories.map(c => c.name);
    
    items.forEach(item => {
        const itemDate = dayjs(item.date);
        if (!itemDate.isValid() || !itemDate.isSame(targetDate, 'quarter')) return;
        
        const baseCategory = getBaseCategory(item.categoryKey);
        if (!categoryOrder.includes(baseCategory)) return;
        
        if (usePeriod) {
            const itemPeriod = readField(item, 'period') || '';
            if (itemPeriod === '季') {
                data.counts[baseCategory]++;
                data.blocks.push(item);
            }
        } else {
            data.counts[baseCategory]++;
            data.blocks.push(item);
        }
    });
    
    return data;
}

/**
 * 按年聚合数据
 */
export function aggregateByYear(
    items: Item[], 
    categories: CategoryConfig[], 
    targetDate: dayjs.Dayjs,
    usePeriod = false
): PeriodData {
    const data = createPeriodData(categories);
    const categoryOrder = categories.map(c => c.name);
    
    items.forEach(item => {
        const itemDate = dayjs(item.date);
        if (!itemDate.isValid() || !itemDate.isSame(targetDate, 'year')) return;
        
        const baseCategory = getBaseCategory(item.categoryKey);
        if (!categoryOrder.includes(baseCategory)) return;
        
        if (usePeriod) {
            const itemPeriod = readField(item, 'period') || '';
            if (itemPeriod === '年') {
                data.counts[baseCategory]++;
                data.blocks.push(item);
            }
        } else {
            data.counts[baseCategory]++;
            data.blocks.push(item);
        }
    });
    
    return data;
}

/**
 * 获取月份的周数据
 */
export function getMonthWeeksData(
    items: Item[], 
    categories: CategoryConfig[], 
    targetMonth: dayjs.Dayjs,
    usePeriod = false
): PeriodData[] {
    const monthStart = targetMonth.startOf('month');
    const monthEnd = targetMonth.endOf('month');
    const weeksData = [];
    
    let weekStart = monthStart.startOf('isoWeek');
    while (weekStart.isBefore(monthEnd) || weekStart.isSame(monthEnd, 'week')) {
        const weekEnd = weekStart.endOf('isoWeek');
        const weekItems = items.filter(item => {
            const itemDate = dayjs(item.date);
            return itemDate.isBetween(weekStart, weekEnd, 'day', '[]');
        });
        
        const data = usePeriod 
            ? aggregateByWeek(weekItems, categories, weekStart)
            : aggregateByWeek(weekItems, categories, weekStart);
        
        weeksData.push(data);
        weekStart = weekStart.add(1, 'week');
    }
    
    return weeksData;
}
