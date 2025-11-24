// src/core/utils/heatmap.ts
import type { Item, ViewInstance, BlockTemplate } from '@/core/types/schema';
import { filterByRules } from './itemFilter';

/**
 * 从数据源中过滤出指定 Block 的所有 theme，并按字典序排序去重
 */
export function collectThemePathsForHeatmap(params: {
    items: Item[];
    dataSource: ViewInstance;
    sourceBlock: BlockTemplate;
}): string[] {
    const { items, dataSource, sourceBlock } = params;

    // 先按数据源规则过滤
    const filteredItems = filterByRules(items, dataSource.filters || []);

    const themeSet = new Set<string>();

    filteredItems.forEach(item => {
        if (item.categoryKey === sourceBlock.name && item.theme) {
            themeSet.add(item.theme);
        }
    });

    return Array.from(themeSet).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}
