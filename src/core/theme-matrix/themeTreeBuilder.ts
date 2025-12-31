/**
 * 主题树构建算法 - 兼容 wrapper
 * 
 * 注意：此模块现在是 ThemeTreeBuilder 的兼容 wrapper
 * 新代码应直接使用 @/core/theme/ThemeTreeBuilder
 * 
 * 保留此文件是为了向后兼容 ThemeMatrix 等模块的现有调用
 */
import type { ExtendedTheme, ThemeTreeNode } from '@core/theme-matrix';
import { 
    ThemeTreeBuilder as UnifiedThemeTreeBuilder,
    ThemeTreeNode as UnifiedThemeTreeNode,
} from '@/core/theme/ThemeTreeBuilder';

/**
 * 构建主题树结构 - 兼容 wrapper
 * 
 * @deprecated 请使用 @/core/theme/ThemeTreeBuilder.buildTree
 * 
 * @param themes - 扩展主题列表
 * @param expandedNodes - 展开的节点ID集合
 * @param parentPath - 父路径，默认为空（兼容参数，内部不再使用）
 * @param level - 当前层级，默认为0（兼容参数，内部不再使用）
 * @returns 主题树节点数组
 * 
 * @example
 * const themes = [
 *   { id: '1', path: 'personal', ... },
 *   { id: '2', path: 'personal/habits', ... },
 *   { id: '3', path: 'work', ... }
 * ];
 * const tree = buildThemeTree(themes, new Set(['1']));
 */
export function buildThemeTree(
    themes: ExtendedTheme[],
    expandedNodes: Set<string>,
    parentPath: string = '',
    level: number = 0
): ThemeTreeNode[] {
    // 如果是递归调用（parentPath 不为空），使用旧逻辑
    // 这是为了保持与现有调用的完全兼容
    if (parentPath !== '') {
        return buildThemeTreeLegacy(themes, expandedNodes, parentPath, level);
    }
    
    // 使用统一的 ThemeTreeBuilder 构建树
    const unifiedTree = UnifiedThemeTreeBuilder.buildTree(themes);
    
    // 转换为旧格式（ThemeMatrix 使用的 ThemeTreeNode）
    const convertNode = (
        node: UnifiedThemeTreeNode,
        nodeLevel: number
    ): ThemeTreeNode | null => {
        // 找到对应的 ExtendedTheme
        const theme = themes.find(t => t.id === node.themeId);
        if (!theme) {
            // 虚节点：没有对应的主题，跳过或查找子节点中的主题
            // 对于 ThemeMatrix，只需要有真实主题的节点
            // 但我们需要保持层级结构，所以递归处理子节点
            const childNodes: ThemeTreeNode[] = [];
            for (const child of node.children) {
                const converted = convertNode(child, nodeLevel);
                if (converted) {
                    childNodes.push(converted);
                }
            }
            // 如果有子节点，我们需要找一个合适的主题作为父节点
            // 但由于虚节点没有主题，这里暂时返回 null
            // 实际上 ThemeMatrix 的调用者会传入 ExtendedTheme[]，
            // 其中每个 path 都应该有对应的主题
            return null;
        }
        
        const children: ThemeTreeNode[] = [];
        for (const child of node.children) {
            const converted = convertNode(child, nodeLevel + 1);
            if (converted) {
                children.push(converted);
            }
        }
        
        return {
            theme,
            children,
            expanded: expandedNodes.has(theme.id),
            level: nodeLevel,
        };
    };
    
    const result: ThemeTreeNode[] = [];
    for (const rootNode of unifiedTree) {
        const converted = convertNode(rootNode, 0);
        if (converted) {
            result.push(converted);
        }
    }
    
    return result;
}

/**
 * 旧版构建逻辑（用于递归调用的兼容）
 */
function buildThemeTreeLegacy(
    themes: ExtendedTheme[],
    expandedNodes: Set<string>,
    parentPath: string,
    level: number
): ThemeTreeNode[] {
    const nodes: ThemeTreeNode[] = [];
    
    // 找出当前层级的直接子节点
    const directChildren = themes.filter(theme => {
        const path = theme.path;
        if (parentPath === '') {
            return !path.includes('/');
        }
        return path.startsWith(parentPath + '/') && 
               path.slice(parentPath.length + 1).indexOf('/') === -1;
    });
    
    // 递归构建每个子节点
    directChildren.forEach(theme => {
        const children = buildThemeTreeLegacy(
            themes.filter(t => t.path.startsWith(theme.path + '/')),
            expandedNodes,
            theme.path,
            level + 1
        );
        
        nodes.push({
            theme,
            children,
            expanded: expandedNodes.has(theme.id),
            level
        });
    });
    
    return nodes;
}

/**
 * 分组主题节点为激活和归档
 * @param themeTree - 主题树节点数组
 * @returns 分组后的主题节点
 */
export function groupThemesByStatus(themeTree: ThemeTreeNode[]): {
    activeThemes: ThemeTreeNode[];
    archivedThemes: ThemeTreeNode[];
} {
    const active: ThemeTreeNode[] = [];
    const archived: ThemeTreeNode[] = [];
    
    themeTree.forEach(node => {
        if (node.theme.status === 'active') {
            active.push(node);
        } else {
            archived.push(node);
        }
    });
    
    return { activeThemes: active, archivedThemes: archived };
}

/**
 * 获取主题的所有子孙节点ID
 * @param node - 主题树节点
 * @returns 包含节点自身及所有子孙节点的ID数组
 */
export function getDescendantIds(node: ThemeTreeNode): string[] {
    const ids: string[] = [node.theme.id];
    
    node.children.forEach(child => {
        ids.push(...getDescendantIds(child));
    });
    
    return ids;
}

/**
 * 在树中查找节点
 * @param tree - 主题树节点数组
 * @param themeId - 要查找的主题ID
 * @returns 找到的节点或null
 */
export function findNodeInTree(
    tree: ThemeTreeNode[],
    themeId: string
): ThemeTreeNode | null {
    for (const node of tree) {
        if (node.theme.id === themeId) {
            return node;
        }
        const found = findNodeInTree(node.children, themeId);
        if (found) {
            return found;
        }
    }
    return null;
}

/**
 * 计算树的最大深度
 * @param tree - 主题树节点数组
 * @returns 最大深度
 */
export function getTreeMaxDepth(tree: ThemeTreeNode[]): number {
    if (tree.length === 0) {
        return 0;
    }
    
    let maxDepth = 0;
    tree.forEach(node => {
        const nodeDepth = 1 + getTreeMaxDepth(node.children);
        maxDepth = Math.max(maxDepth, nodeDepth);
    });
    
    return maxDepth;
}

/**
 * 扁平化主题树
 * @param tree - 主题树节点数组
 * @returns 扁平化的节点数组
 */
export function flattenTree(tree: ThemeTreeNode[]): ThemeTreeNode[] {
    const result: ThemeTreeNode[] = [];
    
    function traverse(nodes: ThemeTreeNode[]) {
        nodes.forEach(node => {
            result.push(node);
            if (node.expanded && node.children.length > 0) {
                traverse(node.children);
            }
        });
    }
    
    traverse(tree);
    return result;
}
