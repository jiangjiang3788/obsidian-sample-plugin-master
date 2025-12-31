/**
 * 统一主题树构建器 - 单一真源
 * 
 * 用于构建主题树结构，供 QuickInput、ThemeMatrix、AI Chat 等模块共用
 */
import type { ThemeDefinition } from '@/core/types/schema';

/**
 * 主题树节点 - 统一结构
 */
export interface ThemeTreeNode {
    /** 节点唯一标识（使用路径作为 ID） */
    id: string;
    /** 节点显示名称（路径最后一段） */
    label: string;
    /** 完整路径 */
    path: string;
    /** 节点层级深度（从 0 开始） */
    depth: number;
    /** 关联的主题 ID（叶子节点有值，虚节点为 null） */
    themeId: string | null;
    /** 关联的完整主题定义（叶子节点有值，虚节点为 null） */
    theme: ThemeDefinition | null;
    /** 父节点 ID（根节点为 null） */
    parentId: string | null;
    /** 子节点列表 */
    children: ThemeTreeNode[];
}

/**
 * 扁平化的树节点（用于搜索/列表展示）
 */
export interface FlatThemeTreeNode extends ThemeTreeNode {
    /** 是否展开（运行时状态） */
    expanded?: boolean;
    /** 是否可见（基于搜索过滤） */
    visible?: boolean;
}

/**
 * 构建选项
 */
export interface BuildThemeTreeOptions {
    /** 排序方式：'path' | 'label'，默认 'path' */
    sortBy?: 'path' | 'label';
    /** 是否创建虚节点（中间层节点），默认 true */
    createVirtualNodes?: boolean;
}

/**
 * ThemeTreeBuilder - 主题树构建器
 * 
 * 提供统一的主题树构建逻辑，确保项目中所有模块使用一致的树结构
 */
export class ThemeTreeBuilder {
    /**
     * 构建主题树
     * 
     * @param themes - 主题定义列表
     * @param options - 构建选项
     * @returns 树节点数组（根节点列表）
     * 
     * @example
     * ```typescript
     * const themes = [
     *   { id: '1', path: 'work/project', ... },
     *   { id: '2', path: 'work/meeting', ... },
     *   { id: '3', path: 'personal', ... }
     * ];
     * const tree = ThemeTreeBuilder.buildTree(themes);
     * // 结果：
     * // [
     * //   { id: 'work', label: 'work', children: [
     * //     { id: 'work/project', label: 'project', themeId: '1', ... },
     * //     { id: 'work/meeting', label: 'meeting', themeId: '2', ... }
     * //   ]},
     * //   { id: 'personal', label: 'personal', themeId: '3', ... }
     * // ]
     * ```
     */
    static buildTree(
        themes: ThemeDefinition[],
        options: BuildThemeTreeOptions = {}
    ): ThemeTreeNode[] {
        const { sortBy = 'path', createVirtualNodes = true } = options;

        if (!themes || themes.length === 0) {
            return [];
        }

        const roots: ThemeTreeNode[] = [];
        const nodeMap = new Map<string, ThemeTreeNode>();

        // 按路径排序确保父节点先被创建
        const sortedThemes = [...themes].sort((a, b) => a.path.localeCompare(b.path));

        for (const theme of sortedThemes) {
            const parts = theme.path.split('/');
            let currentPath = '';
            let parentNode: ThemeTreeNode | null = null;

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isLeaf = i === parts.length - 1;
                currentPath = currentPath ? `${currentPath}/${part}` : part;

                let node = nodeMap.get(currentPath);

                if (!node) {
                    // 创建新节点
                    const newNode: ThemeTreeNode = {
                        id: currentPath,
                        label: part,
                        path: currentPath,
                        depth: i,
                        themeId: isLeaf ? theme.id : null,
                        theme: isLeaf ? theme : null,
                        parentId: parentNode?.id ?? null,
                        children: [],
                    };
                    node = newNode;
                    nodeMap.set(currentPath, newNode);

                    // 添加到父节点或根列表
                    if (parentNode) {
                        if (!parentNode.children.some(c => c.id === newNode.id)) {
                            parentNode.children.push(newNode);
                        }
                    } else {
                        if (!roots.some(r => r.id === newNode.id)) {
                            roots.push(newNode);
                        }
                    }
                } else if (isLeaf) {
                    // 更新已存在的虚节点为真实节点
                    node.themeId = theme.id;
                    node.theme = theme;
                }

                parentNode = node;
            }
        }

        // 排序子节点
        const sortNodes = (nodes: ThemeTreeNode[]): void => {
            nodes.sort((a, b) => {
                if (sortBy === 'label') {
                    return a.label.localeCompare(b.label);
                }
                return a.path.localeCompare(b.path);
            });
            nodes.forEach(node => sortNodes(node.children));
        };
        sortNodes(roots);

        return roots;
    }

    /**
     * 扁平化主题树
     * 
     * @param nodes - 树节点数组
     * @param expandedIds - 展开的节点 ID 集合（可选）
     * @returns 扁平化的节点数组
     */
    static flattenTree(
        nodes: ThemeTreeNode[],
        expandedIds?: Set<string>
    ): FlatThemeTreeNode[] {
        const result: FlatThemeTreeNode[] = [];

        const traverse = (nodeList: ThemeTreeNode[], visible: boolean = true): void => {
            for (const node of nodeList) {
                const expanded = expandedIds?.has(node.id) ?? true;
                result.push({
                    ...node,
                    expanded,
                    visible,
                });
                // 只有展开的节点的子节点才可见
                if (node.children.length > 0) {
                    traverse(node.children, visible && expanded);
                }
            }
        };

        traverse(nodes);
        return result;
    }

    /**
     * 根据主题 ID 获取完整路径
     * 
     * @param nodes - 树节点数组
     * @param themeId - 主题 ID
     * @returns 路径字符串，未找到返回 null
     */
    static getThemePath(nodes: ThemeTreeNode[], themeId: string): string | null {
        const search = (nodeList: ThemeTreeNode[]): string | null => {
            for (const node of nodeList) {
                if (node.themeId === themeId) {
                    return node.path;
                }
                const found = search(node.children);
                if (found) return found;
            }
            return null;
        };
        return search(nodes);
    }

    /**
     * 根据路径获取节点
     * 
     * @param nodes - 树节点数组
     * @param path - 节点路径
     * @returns 找到的节点或 null
     */
    static findNodeByPath(nodes: ThemeTreeNode[], path: string): ThemeTreeNode | null {
        const parts = path.split('/');
        let current: ThemeTreeNode | undefined;
        let searchList = nodes;

        for (const part of parts) {
            const expectedPath = current ? `${current.path}/${part}` : part;
            current = searchList.find(n => n.path === expectedPath);
            if (!current) return null;
            searchList = current.children;
        }

        return current ?? null;
    }

    /**
     * 根据主题 ID 获取节点
     * 
     * @param nodes - 树节点数组
     * @param themeId - 主题 ID
     * @returns 找到的节点或 null
     */
    static findNodeByThemeId(nodes: ThemeTreeNode[], themeId: string): ThemeTreeNode | null {
        const search = (nodeList: ThemeTreeNode[]): ThemeTreeNode | null => {
            for (const node of nodeList) {
                if (node.themeId === themeId) {
                    return node;
                }
                const found = search(node.children);
                if (found) return found;
            }
            return null;
        };
        return search(nodes);
    }

    /**
     * 过滤树节点
     * 
     * @param nodes - 树节点数组
     * @param predicate - 过滤谓词函数
     * @returns 过滤后的树（保留匹配节点及其祖先路径）
     */
    static filterTree(
        nodes: ThemeTreeNode[],
        predicate: (node: ThemeTreeNode) => boolean
    ): ThemeTreeNode[] {
        const filterNodes = (nodeList: ThemeTreeNode[]): ThemeTreeNode[] => {
            return nodeList
                .map(node => {
                    // 先过滤子节点
                    const filteredChildren = filterNodes(node.children);
                    
                    // 如果节点本身匹配或有匹配的子节点，保留该节点
                    if (predicate(node) || filteredChildren.length > 0) {
                        return {
                            ...node,
                            children: filteredChildren,
                        };
                    }
                    return null;
                })
                .filter((n): n is ThemeTreeNode => n !== null);
        };

        return filterNodes(nodes);
    }

    /**
     * 搜索过滤（按路径或标签匹配）
     * 
     * @param nodes - 树节点数组
     * @param searchTerm - 搜索词
     * @returns 匹配的树节点
     */
    static searchTree(nodes: ThemeTreeNode[], searchTerm: string): ThemeTreeNode[] {
        if (!searchTerm.trim()) {
            return nodes;
        }

        const term = searchTerm.toLowerCase();
        return ThemeTreeBuilder.filterTree(nodes, node => {
            return (
                node.label.toLowerCase().includes(term) ||
                node.path.toLowerCase().includes(term)
            );
        });
    }

    /**
     * 获取节点的所有祖先路径
     * 
     * @param path - 节点路径
     * @returns 祖先路径数组（不包括自身）
     */
    static getAncestorPaths(path: string): string[] {
        const parts = path.split('/');
        const ancestors: string[] = [];
        let currentPath = '';

        for (let i = 0; i < parts.length - 1; i++) {
            currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
            ancestors.push(currentPath);
        }

        return ancestors;
    }

    /**
     * 获取节点的所有后代路径
     * 
     * @param node - 树节点
     * @returns 后代路径数组（不包括自身）
     */
    static getDescendantPaths(node: ThemeTreeNode): string[] {
        const descendants: string[] = [];

        const collect = (n: ThemeTreeNode): void => {
            for (const child of n.children) {
                descendants.push(child.path);
                collect(child);
            }
        };

        collect(node);
        return descendants;
    }

    /**
     * 获取所有叶子节点（有真实主题关联的节点）
     * 
     * @param nodes - 树节点数组
     * @returns 叶子节点数组
     */
    static getLeafNodes(nodes: ThemeTreeNode[]): ThemeTreeNode[] {
        const leaves: ThemeTreeNode[] = [];

        const collect = (nodeList: ThemeTreeNode[]): void => {
            for (const node of nodeList) {
                if (node.themeId !== null) {
                    leaves.push(node);
                }
                collect(node.children);
            }
        };

        collect(nodes);
        return leaves;
    }
}

// ============== 便捷函数导出 ==============

/**
 * 构建主题树（便捷函数）
 */
export function buildThemeTree(
    themes: ThemeDefinition[],
    options?: BuildThemeTreeOptions
): ThemeTreeNode[] {
    return ThemeTreeBuilder.buildTree(themes, options);
}

/**
 * 扁平化主题树（便捷函数）
 */
export function flattenThemeTree(
    nodes: ThemeTreeNode[],
    expandedIds?: Set<string>
): FlatThemeTreeNode[] {
    return ThemeTreeBuilder.flattenTree(nodes, expandedIds);
}

/**
 * 搜索主题树（便捷函数）
 */
export function searchThemeTree(
    nodes: ThemeTreeNode[],
    searchTerm: string
): ThemeTreeNode[] {
    return ThemeTreeBuilder.searchTree(nodes, searchTerm);
}
