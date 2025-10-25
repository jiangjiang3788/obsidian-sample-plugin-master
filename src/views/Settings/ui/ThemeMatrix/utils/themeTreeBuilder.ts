/**
 * 主题树构建算法
 */
import type { ExtendedTheme, ThemeTreeNode } from '../types';

/**
 * 构建主题树结构
 * @param themes - 扩展主题列表
 * @param expandedNodes - 展开的节点ID集合
 * @param parentPath - 父路径，默认为空
 * @param level - 当前层级，默认为0
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
    const nodes: ThemeTreeNode[] = [];
    
    // 找出当前层级的直接子节点
    const directChildren = themes.filter(theme => {
        const path = theme.path;
        if (parentPath === '') {
            // 根节点：不包含'/'的路径
            return !path.includes('/');
        }
        // 子节点：以父路径开始，且在父路径之后只有一级
        return path.startsWith(parentPath + '/') && 
               path.slice(parentPath.length + 1).indexOf('/') === -1;
    });
    
    // 递归构建每个子节点
    directChildren.forEach(theme => {
        const children = buildThemeTree(
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
