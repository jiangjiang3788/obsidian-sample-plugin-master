/**
 * 统一主题树构建器 - 单一真源。
 *
 * V12 后此文件只保留公共 facade：树构建、查询、过滤的实现分别进入
 * ThemeTreeBuild / ThemeTreeQueries，避免公共入口继续膨胀为巨型文件。
 */
import type { ThemeDefinition } from '@/core/types/schema';
import { buildThemeTreeNodes } from './ThemeTreeBuild';
import {
    filterThemeTreeNodes,
    findThemeTreeNodeByPath,
    findThemeTreeNodeByThemeId,
    flattenThemeTreeNodes,
    getThemeAncestorPaths,
    getThemeDescendantPaths,
    getThemeLeafNodes,
    getThemePathFromTree,
    searchThemeTreeNodes,
} from './ThemeTreeQueries';
import type { BuildThemeTreeOptions, FlatThemeTreeNode, ThemeTreeNode } from './ThemeTreeTypes';

export type { BuildThemeTreeOptions, FlatThemeTreeNode, ThemeTreeNode } from './ThemeTreeTypes';

/** ThemeTreeBuilder - 主题树构建器。 */
export class ThemeTreeBuilder {
    static buildTree(themes: ThemeDefinition[], options: BuildThemeTreeOptions = {}): ThemeTreeNode[] {
        return buildThemeTreeNodes(themes, options);
    }

    static flattenTree(nodes: ThemeTreeNode[], expandedIds?: Set<string>): FlatThemeTreeNode[] {
        return flattenThemeTreeNodes(nodes, expandedIds);
    }

    static getThemePath(nodes: ThemeTreeNode[], themeId: string): string | null {
        return getThemePathFromTree(nodes, themeId);
    }

    static findNodeByPath(nodes: ThemeTreeNode[], path: string): ThemeTreeNode | null {
        return findThemeTreeNodeByPath(nodes, path);
    }

    static findNodeByThemeId(nodes: ThemeTreeNode[], themeId: string): ThemeTreeNode | null {
        return findThemeTreeNodeByThemeId(nodes, themeId);
    }

    static filterTree(nodes: ThemeTreeNode[], predicate: (node: ThemeTreeNode) => boolean): ThemeTreeNode[] {
        return filterThemeTreeNodes(nodes, predicate);
    }

    static searchTree(nodes: ThemeTreeNode[], searchTerm: string): ThemeTreeNode[] {
        return searchThemeTreeNodes(nodes, searchTerm);
    }

    static getAncestorPaths(path: string): string[] {
        return getThemeAncestorPaths(path);
    }

    static getDescendantPaths(node: ThemeTreeNode): string[] {
        return getThemeDescendantPaths(node);
    }

    static getLeafNodes(nodes: ThemeTreeNode[]): ThemeTreeNode[] {
        return getThemeLeafNodes(nodes);
    }
}

/** 构建主题树（便捷函数）。 */
export function buildThemeTree(themes: ThemeDefinition[], options?: BuildThemeTreeOptions): ThemeTreeNode[] {
    return ThemeTreeBuilder.buildTree(themes, options);
}

/** 扁平化主题树（便捷函数）。 */
export function flattenThemeTree(nodes: ThemeTreeNode[], expandedIds?: Set<string>): FlatThemeTreeNode[] {
    return ThemeTreeBuilder.flattenTree(nodes, expandedIds);
}

/** 搜索主题树（便捷函数）。 */
export function searchThemeTree(nodes: ThemeTreeNode[], searchTerm: string): ThemeTreeNode[] {
    return ThemeTreeBuilder.searchTree(nodes, searchTerm);
}
