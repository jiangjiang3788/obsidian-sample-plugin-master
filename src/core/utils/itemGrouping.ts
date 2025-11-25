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
 * 多字段层级分组用的节点结构
 */
export interface GroupNode {
    key: string;           // 当前层的分组 key（字段值）
    field: string;         // 当前层使用的字段名
    items?: Item[];        // 叶子节点：具体 items
    children?: GroupNode[];// 中间节点：子分组
}

/**
 * 按多个字段做层级分组，按 fields 的顺序依次分组：
 *  例如 ['A','B','C'] => A 层 -> B 层 -> C 层 -> items
 * 每一层复用 groupItemsByField + getSortedGroupKeys 的逻辑。
 */
export function groupItemsByFields(items: Item[], fields: string[]): GroupNode[] {
    if (!fields || fields.length === 0) {
        // 不分组时，返回一个虚拟根节点，方便视图统一处理
        return [{
            key: '__all__',
            field: '__all__',
            items,
        }];
    }

    const groupLevel = (levelItems: Item[], level: number): GroupNode[] => {
        const field = fields[level];

        // 复用单字段分组逻辑（包括 defaultLabel 行为）
        const grouped = groupItemsByField(levelItems, field);
        const keys = getSortedGroupKeys(grouped);

        return keys.map(key => {
            const bucket = grouped[key];
            if (level === fields.length - 1) {
                // 最后一层：叶子节点，挂 items
                return {
                    key,
                    field,
                    items: bucket,
                } as GroupNode;
            } else {
                // 中间层：子节点继续按下一字段分组
                return {
                    key,
                    field,
                    children: groupLevel(bucket, level + 1),
                } as GroupNode;
            }
        });
    };

    return groupLevel(items, 0);
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
