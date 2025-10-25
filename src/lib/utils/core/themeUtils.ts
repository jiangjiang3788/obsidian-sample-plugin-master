// src/core/utils/themeUtils.ts
import type { ThemeDefinition } from '../../types/domain/schema';

// 定义树节点的结构 (这个在上次修改中已添加，保持不变)
export interface ThemeTreeNode {
    id: string;
    name: string;
    themeId: string | null;
    children: ThemeTreeNode[];
}

// buildThemeTree 函数保持不变，快速输入面板依然需要它
export function buildThemeTree(themes: ThemeDefinition[]): ThemeTreeNode[] {
    const roots: ThemeTreeNode[] = [];
    const map = new Map<string, ThemeTreeNode>();

    themes.forEach(theme => {
        const parts = theme.path.split('/');
        let currentPath = '';
        let parentNode: ThemeTreeNode | undefined;

        parts.forEach((part, index) => {
            const isLastName = index === parts.length - 1;
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (!map.has(currentPath)) {
                const newNode: ThemeTreeNode = {
                    id: currentPath,
                    name: part,
                    themeId: isLastName ? theme.id : null,
                    children: [],
                };
                map.set(currentPath, newNode);

                if (parentNode) {
                    if (!parentNode.children.some(child => child.id === newNode.id)) {
                        parentNode.children.push(newNode);
                    }
                } else {
                    if (!roots.some(root => root.id === newNode.id)) {
                        roots.push(newNode);
                    }
                }
            }
            else if (isLastName) {
                const existingNode = map.get(currentPath)!;
                existingNode.themeId = theme.id;
            }
            
            parentNode = map.get(currentPath)!;
        });
    });

    return roots;
}


/**
 * [重构] 简化主题路径列表，只保留最具体的路径。
 * 例如: ['A', 'A/B', 'C'] => ['A/B', 'C']
 * @param paths - 主题路径的字符串数组。
 * @returns 一个只包含最具体路径的新数组。
 */
function getMostSpecificPaths(paths: string[]): string[] {
    if (!paths || paths.length < 2) {
        return paths;
    }
    
    // 创建一个 Set 以便高效删除
    const specificPaths = new Set(paths);

    for (const p1 of paths) {
        for (const p2 of paths) {
            if (p1 === p2) continue;
            // 如果 p2 是 p1 的子路径 (e.g., p1='A', p2='A/B')，那么 p1 就不是最具体的，应该被删除
            if (p2.startsWith(p1 + '/')) {
                specificPaths.delete(p1);
            }
        }
    }
    
    return Array.from(specificPaths);
}

/**
 * [新增] 核心工具函数：分离并简化标签用于最终显示
 * 1. 从 item 的所有 tags 中识别出哪些是主题。
 * 2. 对识别出的主题应用“最具体”规则 (e.g., '生活' vs '生活/睡眠' -> '生活/睡眠')。
 * 3. 提取最具体主题的最后一部分作为显示标签 (e.g., '生活/睡眠' -> '睡眠')。
 * 4. 返回简化后的主题标签和剩余的普通标签。
 * @param itemTags - Item 对象中的 tags 数组。
 * @param allThemes - 插件设置中定义的所有主题。
 * @returns 包含 { themeLabels, regularTags } 的对象。
 */
export function getSimplifiedThemeDisplay(
    itemTags: string[], 
    allThemes: ThemeDefinition[]
): { themeLabels: { fullPath: string; label: string }[], regularTags: string[] } {
    
    const allThemePaths = new Set(allThemes.map(t => t.path));
    
    const themeTags: string[] = [];
    const regularTags: string[] = [];

    // 步骤1: 分离主题标签和普通标签
    for (const tag of itemTags) {
        if (allThemePaths.has(tag)) {
            themeTags.push(tag);
        } else {
            regularTags.push(tag);
        }
    }

    // 步骤2: 对主题标签应用“最具体”规则
    const specificThemePaths = getMostSpecificPaths(themeTags);

    // 步骤3: 提取最后一部分作为显示标签
    const themeLabels = specificThemePaths.map(path => ({
        fullPath: path,
        label: path.split('/').pop() || path,
    }));

    // 步骤4: 返回结果
    return { themeLabels, regularTags };
}