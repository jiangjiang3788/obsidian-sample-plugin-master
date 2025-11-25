import type { Item, ThemeDefinition } from '@/core/types/schema';
import { readField } from '@/core/types/schema';

/**
 * 按主题和日期聚合数据
 */
export function buildThemeDataMap(
    items: Item[], 
    themePaths: string[]
): Map<string, Map<string, Item[]>> {
    const themeMap = new Map<string, Map<string, Item[]>>();
    
    const themesToTrack = themePaths && themePaths.length > 0 
        ? themePaths 
        : ['__default__'];
    
    // 初始化所有主题的映射
    themesToTrack.forEach(theme => themeMap.set(theme, new Map()));

    // 改进的数据聚合逻辑：确保每个 item 都被正确分配
    items.forEach((item) => {
        if (!item.date) return;
        
        // 确定这个 item 应该分配到哪个主题
        let targetTheme = '__default__';
        
        // 如果配置了多个主题，且 item 有主题信息
        if (themesToTrack.length > 1 && themesToTrack[0] !== '__default__') {
            // 只有当 item 的主题在要跟踪的主题列表中时，才分配到对应主题
            if (item.theme && themesToTrack.includes(item.theme)) {
                targetTheme = item.theme;
            } else {
                return; // 跳过这个 item
            }
        }
        
        // 将 item 分配到目标主题
        const targetThemeMap = themeMap.get(targetTheme);
        if (targetThemeMap) {
            const existingItems = targetThemeMap.get(item.date) || [];
            targetThemeMap.set(item.date, [...existingItems, item]);
        }
    });
    
    return themeMap;
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
