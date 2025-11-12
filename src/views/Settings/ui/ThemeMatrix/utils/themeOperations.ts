/**
 * 主题操作辅助函数
 */
import { BATCH_OPERATIONS } from '@/constants';
import { pathUtils } from '@core/utils/pathUtils';
import type { ActiveStatus, BatchOperationType } from '@/shared/types/common';
import type { ExtendedTheme, ThemeTreeNode, ThemeOverrideKey } from '../types';
import type { ThemeOverride } from '@domain/schema';
import { findNodeInTree, getDescendantIds } from './themeTreeBuilder';

/**
 * 创建主题覆盖映射键
 * @param themeId - 主题ID
 * @param blockId - Block ID
 * @returns 映射键
 */
export function createOverrideKey(themeId: string, blockId: string): ThemeOverrideKey {
    return `${themeId}:${blockId}`;
}

/**
 * 解析主题覆盖映射键
 * @param key - 映射键
 * @returns 主题ID和Block ID
 */
export function parseOverrideKey(key: ThemeOverrideKey): { themeId: string; blockId: string } {
    const [themeId, blockId] = key.split(':');
    return { themeId, blockId };
}

/**
 * 创建覆盖配置映射
 * @param overrides - 覆盖配置数组
 * @returns 覆盖配置映射
 */
export function createOverridesMap(overrides: ThemeOverride[]): Map<ThemeOverrideKey, ThemeOverride> {
    const map = new Map<ThemeOverrideKey, ThemeOverride>();
    overrides.forEach(override => {
        const key = createOverrideKey(override.themeId, override.blockId);
        map.set(key, override);
    });
    return map;
}

/**
 * 检查主题是否有子主题
 * @param theme - 主题
 * @param allThemes - 所有主题列表
 * @returns 是否有子主题
 */
export function hasChildren(theme: ExtendedTheme, allThemes: ExtendedTheme[]): boolean {
    return allThemes.some(t => t.path.startsWith(theme.path + '/'));
}

/**
 * 获取选择状态（包含级联）
 * @param themeId - 主题ID
 * @param tree - 主题树
 * @param selectedThemes - 选中的主题集合
 * @returns 选择状态：'checked' | 'unchecked' | 'indeterminate'
 */
export function getSelectionState(
    themeId: string,
    tree: ThemeTreeNode[],
    selectedThemes: Set<string>
): 'checked' | 'unchecked' | 'indeterminate' {
    const node = findNodeInTree(tree, themeId);
    if (!node) {
        return 'unchecked';
    }
    
    const isSelected = selectedThemes.has(themeId);
    if (isSelected) {
        return 'checked';
    }
    
    // 检查是否有子节点被选中
    const descendantIds = getDescendantIds(node);
    const hasSelectedDescendants = descendantIds.some(id => selectedThemes.has(id));
    
    return hasSelectedDescendants ? 'indeterminate' : 'unchecked';
}

/**
 * 切换主题选择（包含子节点）
 * @param themeId - 主题ID
 * @param tree - 主题树
 * @param selectedThemes - 当前选中的主题集合
 * @param includeChildren - 是否包含子节点
 * @returns 新的选中主题集合
 */
export function toggleThemeSelection(
    themeId: string,
    tree: ThemeTreeNode[],
    selectedThemes: Set<string>,
    includeChildren: boolean = true
): Set<string> {
    const newSelected = new Set(selectedThemes);
    const node = findNodeInTree(tree, themeId);
    
    if (!node) {
        return newSelected;
    }
    
    const isSelected = newSelected.has(themeId);
    
    if (isSelected) {
        // 取消选择
        newSelected.delete(themeId);
        if (includeChildren) {
            const descendantIds = getDescendantIds(node);
            descendantIds.forEach(id => newSelected.delete(id));
        }
    } else {
        // 选择
        newSelected.add(themeId);
        if (includeChildren) {
            const descendantIds = getDescendantIds(node);
            descendantIds.forEach(id => newSelected.add(id));
        }
    }
    
    return newSelected;
}

/**
 * 过滤主题列表
 * @param themes - 主题列表
 * @param filter - 过滤条件
 * @returns 过滤后的主题列表
 */
export function filterThemes(
    themes: ExtendedTheme[],
    filter: {
        status?: ActiveStatus;
        searchText?: string;
        hasOverrides?: boolean;
    }
): ExtendedTheme[] {
    return themes.filter(theme => {
        // 状态过滤
        if (filter.status && theme.status !== filter.status) {
            return false;
        }
        
        // 搜索文本过滤
        if (filter.searchText) {
            const searchLower = filter.searchText.toLowerCase();
            const pathLower = theme.path.toLowerCase();
            const iconLower = (theme.icon || '').toLowerCase();
            if (!pathLower.includes(searchLower) && !iconLower.includes(searchLower)) {
                return false;
            }
        }
        
        return true;
    });
}

/**
 * 排序主题列表
 * @param themes - 主题列表
 * @param sortBy - 排序字段
 * @param order - 排序顺序
 * @returns 排序后的主题列表
 */
export function sortThemes(
    themes: ExtendedTheme[],
    sortBy: 'path' | 'status' | 'usageCount' | 'lastUsed' = 'path',
    order: 'asc' | 'desc' = 'asc'
): ExtendedTheme[] {
    const sorted = [...themes].map(theme => ({
        ...theme,
        // 确保 undefined 值被转换为 0
        usageCount: theme.usageCount ?? 0,
        lastUsed: theme.lastUsed ?? 0
    })).sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
            case 'path':
                comparison = a.path.localeCompare(b.path);
                break;
            case 'status':
                comparison = (a.status || '').localeCompare(b.status || '');
                break;
            case 'usageCount':
                comparison = (a.usageCount || 0) - (b.usageCount || 0);
                break;
            case 'lastUsed':
                comparison = (a.lastUsed || 0) - (b.lastUsed || 0);
                break;
        }
        
        return order === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
}

/**
 * 处理主题选择（新的函数名）
 * @param themeId - 主题ID
 * @param includeChildren - 是否包含子节点
 * @param selectedThemes - 当前选中的主题集合
 * @param tree - 主题树
 * @returns 新的选中主题集合
 */
export function handleThemeSelection(
    themeId: string,
    includeChildren: boolean,
    selectedThemes: Set<string>,
    tree: ThemeTreeNode[]
): Set<string> {
    return toggleThemeSelection(themeId, tree, selectedThemes, includeChildren);
}

/**
 * 处理批量操作
 * @param operation - 操作类型
 * @param selectedThemes - 选中的主题集合
 * @param extendedThemes - 扩展主题列表
 * @param themeService - 主题服务
 * @param appStore - 应用存储
 */
export function handleBatchOperation(
    operation: BatchOperationType,
    selectedThemes: Set<string>,
    extendedThemes: ExtendedTheme[],
    themeService: any,
    appStore: any
): void {
    selectedThemes.forEach(themeId => {
        const theme = extendedThemes.find(t => t.id === themeId);
        if (theme) {
            if (operation === BATCH_OPERATIONS.ACTIVATE) {
                // 激活主题的逻辑
                if (themeService.getThemeManager) {
                    themeService.getThemeManager().activateTheme(theme.path);
                }
            } else if (operation === BATCH_OPERATIONS.ARCHIVE) {
                // 归档主题的逻辑
                if (themeService.getThemeManager) {
                    themeService.getThemeManager().deactivateTheme(theme.path);
                }
            } else if (operation === BATCH_OPERATIONS.DELETE && theme.source !== 'predefined') {
                // 删除主题的逻辑（仅限非预定义主题）
                appStore.deleteTheme(themeId);
            }
        }
    });
}

/**
 * 获取所有子节点ID
 * @param node - 主题树节点
 * @returns 子节点ID数组
 */
export function getAllChildIds(node: ThemeTreeNode): string[] {
    return getDescendantIds(node);
}
