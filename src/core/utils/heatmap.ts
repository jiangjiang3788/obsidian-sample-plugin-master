// src/core/utils/heatmap.ts
import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { ViewInstance } from '@/core/view/ViewConfig';
import type { RecordCaptureTemplate } from '@/core/recordInput/CaptureTemplate';
import { queryRecordItems } from '@/core/query/RecordQuery';

/** Collect canonical Goal paths for a Heatmap source block. */
export function collectGoalPathsForHeatmap(params: {
    items: RecordViewItem[];
    dataSource: ViewInstance;
    sourceBlock: RecordCaptureTemplate;
}): string[] {
    const { items, dataSource, sourceBlock } = params;
    const filteredItems = queryRecordItems(items, { filterGroups: [dataSource.filters || []] });
    const paths = new Set<string>();
    filteredItems.forEach((item) => {
        const itemBlock = item.coreBlock ? `core.${String(item.coreBlock).replace(/^core\./, '')}` : '';
        const sourceBlockKey = sourceBlock.recordTypeId || sourceBlock.id || sourceBlock.name || sourceBlock.categoryKey;
        const isSourceBlock = itemBlock === sourceBlockKey
            || item.categoryKey === sourceBlock.categoryKey
            || item.categoryKey === sourceBlock.name;
        const goalPath = String(item.goalPath || item.extra?.['目标'] || '').trim();
        if (isSourceBlock && goalPath) paths.add(goalPath);
    });
    return Array.from(paths).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}


/**
 * Heatmap UI helpers（纯判断）
 * ---------------------------------------------------------------
 * 这些函数原先在 core/config/heatmapViewConfig.ts 中对外导出。
 * 现在统一归入 core/utils（通过 @core/public 暴露）。
 */

/** Effective count semantics used by Heatmap cells. */
export function getEffectiveLevelCount(item: RecordViewItem): number {
    if (item.levelCount !== undefined) return item.levelCount;
    if (item.countForLevel === false) return 0;
    return item.displayCount || 1;
}

export function getEffectiveDisplayCount(item: RecordViewItem): number {
    return item.displayCount || 1;
}

export const isImagePath = (value: string): boolean => {
    return /\.(png|svg|jpg|jpeg|gif)$/i.test(value);
};

export const isHexColor = (value: string): boolean => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);
};
