// src/lib/utils/core/dataAggregation.ts
/** 统一数据聚合处理层 - 解决多次打卡统计问题 */

import { Item } from '@/core/types/schema';
import { dayjs } from './date';
import { getEffectiveDisplayCount, getEffectiveLevelCount } from './levelingSystem';

export interface AggregatedData {
    // 基础统计
    totalCount: number;           // 总打卡次数
    uniqueDays: number;          // 打卡天数
    items: Item[];               // 原始条目
    
    // 按日期聚合
    dailyData: Map<string, DailyData>;
    
    // 按分类聚合  
    categoryData: Map<string, CategoryData>;
    
    // 按主题聚合
    themeData: Map<string, ThemeData>;
}

export interface DailyData {
    date: string;
    totalCount: number;          // 当日总打卡次数
    displayCount: number;        // 显示次数
    levelCount: number;          // 升级次数
    items: Item[];
    categoryBreakdown: Map<string, number>;
    themeBreakdown: Map<string, number>;
}

export interface CategoryData {
    name: string;
    totalCount: number;
    displayCount: number;
    levelCount: number;
    items: Item[];
    dailyBreakdown: Map<string, number>;
}

export interface ThemeData {
    path: string;
    totalCount: number;
    displayCount: number;
    levelCount: number;
    items: Item[];
    dailyBreakdown: Map<string, number>;
    level?: number;              // 当前等级
    progress?: number;           // 升级进度
}

/**
 * 核心数据聚合函数 - 统一处理多次打卡逻辑
 */
export function aggregateItems(items: Item[], options: {
    dateRange?: [Date, Date];
    categories?: string[];
    themes?: string[];
    countMode?: 'display' | 'level' | 'both';
} = {}): AggregatedData {
    const { dateRange, categories, themes, countMode = 'both' } = options;
    
    // 过滤条目
    let filteredItems = items;
    if (dateRange) {
        const [start, end] = dateRange;
        filteredItems = items.filter(item => {
            const itemDate = dayjs(item.date);
            return itemDate.isBetween(dayjs(start), dayjs(end), 'day', '[]');
        });
    }
    
    if (categories) {
        filteredItems = filteredItems.filter(item => {
            const baseCategory = (item.categoryKey || '').split('/')[0];
            return categories.includes(baseCategory);
        });
    }
    
    if (themes) {
        filteredItems = filteredItems.filter(item => 
            item.theme && themes.includes(item.theme)
        );
    }
    
    // 初始化聚合数据
    const dailyData = new Map<string, DailyData>();
    const categoryData = new Map<string, CategoryData>();
    const themeData = new Map<string, ThemeData>();
    
    // 按日期-分类-主题聚合
    filteredItems.forEach(item => {
        const date = item.date || '';
        const baseCategory = (item.categoryKey || '').split('/')[0];
        const theme = item.theme || '__default__';
        
        const displayCount = getEffectiveDisplayCount(item);
        const levelCount = getEffectiveLevelCount(item);
        
        // 日期聚合
        if (!dailyData.has(date)) {
            dailyData.set(date, {
                date,
                totalCount: 0,
                displayCount: 0,
                levelCount: 0,
                items: [],
                categoryBreakdown: new Map(),
                themeBreakdown: new Map()
            });
        }
        const dayData = dailyData.get(date)!;
        dayData.totalCount++;
        dayData.displayCount += displayCount;
        dayData.levelCount += levelCount;
        dayData.items.push(item);
        dayData.categoryBreakdown.set(baseCategory, (dayData.categoryBreakdown.get(baseCategory) || 0) + displayCount);
        dayData.themeBreakdown.set(theme, (dayData.themeBreakdown.get(theme) || 0) + displayCount);
        
        // 分类聚合
        if (!categoryData.has(baseCategory)) {
            categoryData.set(baseCategory, {
                name: baseCategory,
                totalCount: 0,
                displayCount: 0,
                levelCount: 0,
                items: [],
                dailyBreakdown: new Map()
            });
        }
        const catData = categoryData.get(baseCategory)!;
        catData.totalCount++;
        catData.displayCount += displayCount;
        catData.levelCount += levelCount;
        catData.items.push(item);
        catData.dailyBreakdown.set(date, (catData.dailyBreakdown.get(date) || 0) + displayCount);
        
        // 主题聚合
        if (!themeData.has(theme)) {
            themeData.set(theme, {
                path: theme,
                totalCount: 0,
                displayCount: 0,
                levelCount: 0,
                items: [],
                dailyBreakdown: new Map()
            });
        }
        const thData = themeData.get(theme)!;
        thData.totalCount++;
        thData.displayCount += displayCount;
        thData.levelCount += levelCount;
        thData.items.push(item);
        thData.dailyBreakdown.set(date, (thData.dailyBreakdown.get(date) || 0) + displayCount);
    });
    
    // 计算总体统计
    const totalCount = Array.from(dailyData.values()).reduce((sum, day) => sum + day.displayCount, 0);
    const uniqueDays = dailyData.size;
    
    return {
        totalCount,
        uniqueDays,
        items: filteredItems,
        dailyData,
        categoryData,
        themeData
    };
}

/**
 * 为StatisticsView生成兼容数据格式
 */
export function generateStatisticsData(aggregated: AggregatedData, categories: any[]): {
    counts: Record<string, number>;
    blocks: Item[];
} {
    const counts: Record<string, number> = {};
    const allBlocks: Item[] = [];
    
    categories.forEach(cat => {
        const catData = aggregated.categoryData.get(cat.name);
        counts[cat.name] = catData ? catData.displayCount : 0;
        if (catData) {
            allBlocks.push(...catData.items);
        }
    });
    
    return { counts, blocks: allBlocks };
}

/**
 * 为HeatmapView生成兼容数据格式
 */
export function generateHeatmapData(aggregated: AggregatedData, mode: 'habit' | 'count'): Map<string, any> {
    const result = new Map<string, any>();
    
    if (mode === 'count') {
        // 计数模式：返回每日总次数
        aggregated.dailyData.forEach((dayData, date) => {
            result.set(date, dayData.displayCount);
        });
    } else {
        // 习惯模式：返回每日最具代表性的条目（可扩展为多个）
        aggregated.dailyData.forEach((dayData, date) => {
            if (dayData.items.length > 0) {
                // 优先返回评分最高或最新的条目
                const representativeItem = dayData.items
                    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                    [0];
                
                // 为代表性条目添加聚合信息
                result.set(date, {
                    ...representativeItem,
                    _aggregated: {
                        totalItems: dayData.items.length,
                        displayCount: dayData.displayCount,
                        levelCount: dayData.levelCount,
                        allItems: dayData.items
                    }
                });
            }
        });
    }
    
    return result;
}
