import type { Item, ThemeDefinition } from '@/core/types/schema';
import { readField } from '@/core/types/schema';

/**
 * 过滤结果类型
 */
export interface FilterResult {
    kept: Item[];
    skippedCount: number;
    skippedByReason: {
        noDate: number;
        themeNotTracked: number;
    };
}

/**
 * 过滤 items - 根据 themesToTrack 筛选
 * @param items 原始 items
 * @param themesToTrack 要跟踪的主题列表
 * @returns 过滤结果，包含保留的 items 和跳过统计
 */
export function filterItemsByThemes(
    items: Item[],
    themesToTrack: string[]
): FilterResult {
    const kept: Item[] = [];
    const skippedByReason = {
        noDate: 0,
        themeNotTracked: 0
    };

    const isDefaultMode = themesToTrack.length === 0 || 
        (themesToTrack.length === 1 && themesToTrack[0] === '__default__');

    items.forEach(item => {
        // 跳过没有日期的 item
        if (!item.date) {
            skippedByReason.noDate++;
            return;
        }

        // 默认模式：保留所有有日期的 item
        if (isDefaultMode) {
            kept.push(item);
            return;
        }

        // 多主题模式：只保留在 themesToTrack 中的主题
        if (item.theme && themesToTrack.includes(item.theme)) {
            kept.push(item);
        } else {
            skippedByReason.themeNotTracked++;
        }
    });

    return {
        kept,
        skippedCount: skippedByReason.noDate + skippedByReason.themeNotTracked,
        skippedByReason
    };
}

/**
 * 聚合主题数据 - 按主题和日期分组
 * @param items 已过滤的 items
 * @param themesToTrack 要跟踪的主题列表
 * @returns 按主题和日期聚合的 Map
 */
export function aggregateThemeData(
    items: Item[],
    themesToTrack: string[]
): Map<string, Map<string, Item[]>> {
    const themeMap = new Map<string, Map<string, Item[]>>();

    const effectiveThemes = themesToTrack.length > 0 
        ? themesToTrack 
        : ['__default__'];

    // 初始化所有主题的映射
    effectiveThemes.forEach(theme => themeMap.set(theme, new Map()));

    const isDefaultMode = effectiveThemes.length === 1 && effectiveThemes[0] === '__default__';

    items.forEach(item => {
        if (!item.date) return;

        // 确定目标主题
        const targetTheme = isDefaultMode 
            ? '__default__' 
            : (item.theme || '__default__');

        // 获取或创建目标主题的 Map
        let targetThemeMap = themeMap.get(targetTheme);
        if (!targetThemeMap) {
            targetThemeMap = new Map();
            themeMap.set(targetTheme, targetThemeMap);
        }

        // 将 item 添加到对应日期的数组中
        const existingItems = targetThemeMap.get(item.date) || [];
        targetThemeMap.set(item.date, [...existingItems, item]);
    });

    return themeMap;
}

/**
 * 构建主题数据 Map 的扩展结果（包含 skipped 统计）
 */
export interface BuildThemeDataMapResult {
    themeMap: Map<string, Map<string, Item[]>>;
    filterResult: FilterResult;
}

/**
 * 按主题和日期聚合数据（带 skipped 统计的完整版本）
 * @param items 原始 items
 * @param themePaths 主题路径列表
 * @returns 包含 themeMap 和 filterResult 的结果对象
 */
export function buildThemeDataMapWithStats(
    items: Item[], 
    themePaths: string[]
): BuildThemeDataMapResult {
    const themesToTrack = themePaths && themePaths.length > 0 
        ? themePaths 
        : ['__default__'];

    // 1. 过滤
    const filterResult = filterItemsByThemes(items, themesToTrack);

    // 2. 聚合
    const themeMap = aggregateThemeData(filterResult.kept, themesToTrack);

    return { themeMap, filterResult };
}

/**
 * 按主题和日期聚合数据（保持原有 API 兼容）
 * @param items 原始 items
 * @param themePaths 主题路径列表
 * @returns 按主题和日期聚合的 Map
 */
export function buildThemeDataMap(
    items: Item[], 
    themePaths: string[]
): Map<string, Map<string, Item[]>> {
    const result = buildThemeDataMapWithStats(items, themePaths);
    
    // 调试日志（可选）
    if (result.filterResult.skippedCount > 0) {
        console.debug('[buildThemeDataMap] Skipped items:', result.filterResult.skippedByReason);
    }
    
    return result.themeMap;
}

/**
 * 创建主题到定义的映射
 */
export function buildThemesByPathMap(themes: ThemeDefinition[]): Map<string, ThemeDefinition> {
    const map = new Map<string, ThemeDefinition>();
    themes.forEach(t => map.set(t.path, t));
    return map;
}

/**
 * 获取指定主题的所有 items
 */
export function getThemeItems(
    dataByThemeAndDate: Map<string, Map<string, Item[]>>, 
    theme: string
): Item[] {
    const themeData = dataByThemeAndDate.get(theme);
    if (!themeData) return [];
    
    const items: Item[] = [];
    themeData.forEach(itemsOnDate => {
        if (itemsOnDate) items.push(...itemsOnDate);
    });
    
    return items;
}
