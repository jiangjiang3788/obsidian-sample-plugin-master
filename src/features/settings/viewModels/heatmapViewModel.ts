// src/features/settings/viewModels/heatmapViewModel.ts

import type { Item, ViewInstance, InputSettings } from '@core/public';
import { buildThemeDataMap, buildThemesByPathMap } from '@core/public';

/**
 * Phase2: shared/ui 纯化试点（HeatmapView）
 * 把“主题推断/主题选择/数据聚合”从 shared/ui 挪到 feature 层，
 * shared/ui 仅负责渲染 + 交互。
 */
export function buildHeatmapViewModel(params: {
    items: Item[];
    module: ViewInstance;
    inputSettings: InputSettings;
}): {
    themesByPath: Map<string, any>;
    themesToTrack: string[];
    dataByThemeAndDate: Map<string, Map<string, Item[]>>;
} {
    const { items, module, inputSettings } = params;

    const config = module.viewConfig || {};

    const themesByPath = buildThemesByPathMap(inputSettings.themes);

    // 当 viewConfig 未显式指定 themePaths 时：自动从当前 items 推断主题列表
    const inferredThemePaths: string[] = (() => {
        const set = new Set<string>();
        for (const it of items) {
            if (it?.theme && typeof it.theme === 'string' && it.theme.trim().length > 0) {
                set.add(it.theme);
            }
        }
        return Array.from(set);
    })();

    const themesToTrack = Array.isArray((config as any).themePaths) && (config as any).themePaths.length > 0
        ? (config as any).themePaths
        : inferredThemePaths;

    const dataByThemeAndDate = buildThemeDataMap(items, themesToTrack);

    return { themesByPath, themesToTrack, dataByThemeAndDate };
}
