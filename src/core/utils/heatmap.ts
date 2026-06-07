// src/core/utils/heatmap.ts
import type { Item, ViewInstance, BlockTemplate } from '@/core/types/schema';
import { filterByRules } from './itemFilter';

/**
 * 统一读取记录的主题路径。
 *
 * 迁移到目标主线以后，主题不再决定模板，但仍然是打卡视图、统计、
 * 图标和分类的重要维度。历史数据可能写在 item.theme，新数据可能写在
 * item.themePath / extra.themePath / extra.主题。Heatmap 必须统一读这些入口，
 * 否则会落到 __default__，把多个主题混在同一张日历里。
 */
export function getItemThemePath(item: Item | null | undefined): string {
    if (!item) return '';
    const candidates = [
        item.themePath,
        (item as any).themePathNormalized,
        item.theme,
        item.extra?.themePath,
        item.extra?.['themePath'],
        item.extra?.['主题'],
    ];
    for (const value of candidates) {
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
}

/**
 * 从数据源中过滤出指定 Block 的所有 theme，并按字典序排序去重。
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
        const itemBlock = item.coreBlock || item.templateId || item.categoryKey;
        const sourceBlockKey = sourceBlock.coreBlockId || sourceBlock.id || sourceBlock.name || sourceBlock.categoryKey;
        const isSourceBlock = itemBlock === sourceBlockKey
            || item.categoryKey === sourceBlock.categoryKey
            || item.categoryKey === sourceBlock.name;
        const themePath = getItemThemePath(item);
        if (isSourceBlock && themePath) {
            themeSet.add(themePath);
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
