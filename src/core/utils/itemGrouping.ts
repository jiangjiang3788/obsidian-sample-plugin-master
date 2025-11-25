// src/core/utils/itemGrouping.ts
import type { Item } from '@/core/types/schema';
import { readField } from '@/core/types/schema';
import { EMPTY_LABEL } from '@/core/types/constants';

/**
 * 按单个字段对 items 进行分组
 */
export function groupItemsByField(items: Item[], groupField: string, defaultLabel: string = '(未分类)'): Record<string, Item[]> {
    const grouped: Record<string, Item[]> = {};
    
    for (const item of items) {
        const key = String(readField(item, groupField) ?? defaultLabel);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
    }
    
    return grouped;
}

/**
 * 获取分组后的排序键值列表
 */
export function getSortedGroupKeys(grouped: Record<string, Item[]>): string[] {
    return Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

/**
 * 构建表格矩阵数据结构
 */
export interface TableMatrix {
    matrix: Record<string, Record<string, Item[]>>;
    sortedRows: string[];
    sortedCols: string[];
}

export function buildTableMatrix(items: Item[], rowField: string, colField: string): TableMatrix {
    const rowVals: Set<string> = new Set();
    const colVals: Set<string> = new Set();
    const matrix: Record<string, Record<string, Item[]>> = {};

    items.forEach(item => {
        const r = String(readField(item, rowField) ?? EMPTY_LABEL);
        const c = String(readField(item, colField) ?? EMPTY_LABEL);
        rowVals.add(r);
        colVals.add(c);
        if (!matrix[r]) matrix[r] = {};
        if (!matrix[r][c]) matrix[r][c] = [];
        matrix[r][c].push(item);
    });

    const sortedRows = Array.from(rowVals).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    const sortedCols = Array.from(colVals).sort((a, b) => a.localeCompare(b, 'zh-CN'));

    return { matrix, sortedRows, sortedCols };
}

/**
 * 提取 categoryKey 的基础分类（第一级路径）
 */
export function getBaseCategory(categoryKey?: string): string {
    return (categoryKey || '').split('/')[0] || '';
}

/**
 * 从 items 中收集所有基础分类
 */
export function collectBaseCategories(items: Item[]): string[] {
    const categorySet = new Set<string>();
    items.forEach(item => {
        const baseCategory = getBaseCategory(item.categoryKey);
        if (baseCategory) {
            categorySet.add(baseCategory);
        }
    });
    return Array.from(categorySet).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

/**
 * 从视图实例中收集所有可用的分类名称
 */
export function collectCategoriesFromViews(
    viewInstances: any[], 
    predefinedCategories: string[] = []
): string[] {
    const categorySet = new Set<string>();
    
    // 从视图实例中收集分类
    viewInstances.forEach(view => {
        if (view.viewType === 'StatisticsView' && view.viewConfig?.categories) {
            view.viewConfig.categories.forEach((cat: any) => {
                if (cat.name) {
                    categorySet.add(cat.name);
                }
            });
        }
    });

    // 从预定义分类中收集
    predefinedCategories.forEach((cat: string) => categorySet.add(cat));

    return Array.from(categorySet).sort();
}
