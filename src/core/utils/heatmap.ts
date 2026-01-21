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

/**
 * Heatmap UI helpers（纯判断）
 * ---------------------------------------------------------------
 * 这些函数原先在 core/config/heatmapViewConfig.ts 中对外导出。
 * 现在统一归入 core/utils（通过 @core/public 暴露）。
 */

export const isImagePath = (value: string): boolean => {
    return /\.(png|svg|jpg|jpeg|gif)$/i.test(value);
};

export const isHexColor = (value: string): boolean => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);
};
