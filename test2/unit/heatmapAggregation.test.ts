/**
 * heatmapAggregation 单元测试
 * 测试 buildThemeDataMap 和 aggregateThemeData 的核心功能
 */

import {
    filterItemsByThemes,
    aggregateThemeData,
    buildThemeDataMap,
    buildThemeDataMapWithStats,
    getThemeItems,
    FilterResult
} from '@/core/utils/heatmapAggregation';
import type { Item } from '@/core/types/schema';

// 创建测试用的 Item
function createTestItem(overrides: Partial<Item> = {}): Item {
    return {
        id: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        date: '2024-01-15',
        theme: 'theme1',
        categoryKey: 'category1',
        ...overrides
    } as Item;
}

describe('filterItemsByThemes', () => {
    it('should keep all items with date in default mode', () => {
        const items = [
            createTestItem({ date: '2024-01-01', theme: 'theme1' }),
            createTestItem({ date: '2024-01-02', theme: 'theme2' }),
            createTestItem({ date: '2024-01-03', theme: undefined })
        ];

        const result = filterItemsByThemes(items, []);
        
        expect(result.kept.length).toBe(3);
        expect(result.skippedCount).toBe(0);
    });

    it('should skip items without date', () => {
        const items = [
            createTestItem({ date: '2024-01-01' }),
            createTestItem({ date: undefined }),
            createTestItem({ date: '' })
        ];

        const result = filterItemsByThemes(items, []);
        
        // 只有第一个有日期的应该保留
        expect(result.kept.length).toBe(1);
        expect(result.skippedByReason.noDate).toBe(2);
    });

    it('should filter by themesToTrack correctly', () => {
        const items = [
            createTestItem({ date: '2024-01-01', theme: 'theme1' }),
            createTestItem({ date: '2024-01-02', theme: 'theme2' }),
            createTestItem({ date: '2024-01-03', theme: 'theme3' })
        ];

        const result = filterItemsByThemes(items, ['theme1', 'theme2']);
        
        expect(result.kept.length).toBe(2);
        expect(result.skippedByReason.themeNotTracked).toBe(1);
        expect(result.skippedCount).toBe(1);
    });

    it('should handle items with no theme in multi-theme mode', () => {
        const items = [
            createTestItem({ date: '2024-01-01', theme: 'theme1' }),
            createTestItem({ date: '2024-01-02', theme: undefined })
        ];

        const result = filterItemsByThemes(items, ['theme1']);
        
        expect(result.kept.length).toBe(1);
        expect(result.skippedByReason.themeNotTracked).toBe(1);
    });
});

describe('aggregateThemeData', () => {
    it('should aggregate items by theme and date without nesting arrays', () => {
        const items = [
            createTestItem({ date: '2024-01-01', theme: 'theme1' }),
            createTestItem({ date: '2024-01-01', theme: 'theme1' }),
            createTestItem({ date: '2024-01-02', theme: 'theme1' })
        ];

        const result = aggregateThemeData(items, ['theme1']);
        
        const theme1Map = result.get('theme1');
        expect(theme1Map).toBeDefined();
        
        // 验证日期桶里是平铺数组，不是嵌套数组
        const jan1Items = theme1Map!.get('2024-01-01');
        expect(jan1Items).toBeDefined();
        expect(Array.isArray(jan1Items)).toBe(true);
        expect(jan1Items!.length).toBe(2);
        
        // 验证每个元素都是 Item，不是数组
        jan1Items!.forEach(item => {
            expect(item).toHaveProperty('id');
            expect(item).toHaveProperty('date');
            expect(Array.isArray(item)).toBe(false);
        });
    });

    it('should create separate maps for each theme', () => {
        const items = [
            createTestItem({ date: '2024-01-01', theme: 'theme1' }),
            createTestItem({ date: '2024-01-01', theme: 'theme2' })
        ];

        const result = aggregateThemeData(items, ['theme1', 'theme2']);
        
        expect(result.has('theme1')).toBe(true);
        expect(result.has('theme2')).toBe(true);
        
        const theme1Items = result.get('theme1')!.get('2024-01-01');
        const theme2Items = result.get('theme2')!.get('2024-01-01');
        
        expect(theme1Items!.length).toBe(1);
        expect(theme2Items!.length).toBe(1);
    });

    it('should use __default__ in default mode', () => {
        const items = [
            createTestItem({ date: '2024-01-01' })
        ];

        const result = aggregateThemeData(items, []);
        
        expect(result.has('__default__')).toBe(true);
    });
});

describe('buildThemeDataMap', () => {
    it('should return Map structure without nested arrays', () => {
        const items = [
            createTestItem({ date: '2024-01-01', theme: 'theme1' }),
            createTestItem({ date: '2024-01-01', theme: 'theme1' }),
            createTestItem({ date: '2024-01-02', theme: 'theme1' })
        ];

        const result = buildThemeDataMap(items, ['theme1']);
        
        expect(result instanceof Map).toBe(true);
        
        const themeMap = result.get('theme1');
        expect(themeMap instanceof Map).toBe(true);
        
        const dateItems = themeMap!.get('2024-01-01');
        expect(Array.isArray(dateItems)).toBe(true);
        
        // 关键断言：确保不会把 items 变成嵌套数组
        dateItems!.forEach(item => {
            expect(Array.isArray(item)).toBe(false);
            expect(typeof item).toBe('object');
            expect(item).toHaveProperty('date');
        });
    });
});

describe('buildThemeDataMapWithStats', () => {
    it('should return both themeMap and filterResult', () => {
        const items = [
            createTestItem({ date: '2024-01-01', theme: 'theme1' }),
            createTestItem({ date: '2024-01-02', theme: 'theme2' }),
            createTestItem({ date: undefined, theme: 'theme1' })
        ];

        const result = buildThemeDataMapWithStats(items, ['theme1']);
        
        expect(result).toHaveProperty('themeMap');
        expect(result).toHaveProperty('filterResult');
        expect(result.themeMap instanceof Map).toBe(true);
        expect(result.filterResult.skippedCount).toBe(2); // 1 no date + 1 wrong theme
    });

    it('should correctly count skipped items by reason', () => {
        const items = [
            createTestItem({ date: '2024-01-01', theme: 'tracked' }),
            createTestItem({ date: undefined, theme: 'tracked' }),     // noDate
            createTestItem({ date: '2024-01-02', theme: 'untracked' }) // themeNotTracked
        ];

        const result = buildThemeDataMapWithStats(items, ['tracked']);
        
        expect(result.filterResult.kept.length).toBe(1);
        expect(result.filterResult.skippedByReason.noDate).toBe(1);
        expect(result.filterResult.skippedByReason.themeNotTracked).toBe(1);
        expect(result.filterResult.skippedCount).toBe(2);
    });
});

describe('getThemeItems', () => {
    it('should flatten all items for a theme', () => {
        const items = [
            createTestItem({ date: '2024-01-01', theme: 'theme1' }),
            createTestItem({ date: '2024-01-01', theme: 'theme1' }),
            createTestItem({ date: '2024-01-02', theme: 'theme1' })
        ];

        const themeMap = buildThemeDataMap(items, ['theme1']);
        const themeItems = getThemeItems(themeMap, 'theme1');
        
        expect(themeItems.length).toBe(3);
        themeItems.forEach(item => {
            expect(Array.isArray(item)).toBe(false);
        });
    });

    it('should return empty array for non-existent theme', () => {
        const items = [
            createTestItem({ date: '2024-01-01', theme: 'theme1' })
        ];

        const themeMap = buildThemeDataMap(items, ['theme1']);
        const result = getThemeItems(themeMap, 'non-existent');
        
        expect(result).toEqual([]);
    });
});
