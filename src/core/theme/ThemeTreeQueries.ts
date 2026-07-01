import type { FlatThemeTreeNode, ThemeTreeNode } from './ThemeTreeTypes';

export function flattenThemeTreeNodes(nodes: ThemeTreeNode[], expandedIds?: Set<string>): FlatThemeTreeNode[] {
    const result: FlatThemeTreeNode[] = [];

    const traverse = (nodeList: ThemeTreeNode[], visible = true): void => {
        for (const node of nodeList) {
            const expanded = expandedIds?.has(node.id) ?? true;
            result.push({ ...node, expanded, visible });
            if (node.children.length > 0) traverse(node.children, visible && expanded);
        }
    };

    traverse(nodes);
    return result;
}

export function getThemePathFromTree(nodes: ThemeTreeNode[], themeId: string): string | null {
    const search = (nodeList: ThemeTreeNode[]): string | null => {
        for (const node of nodeList) {
            if (node.themeId === themeId) return node.path;
            const found = search(node.children);
            if (found) return found;
        }
        return null;
    };
    return search(nodes);
}

export function findThemeTreeNodeByPath(nodes: ThemeTreeNode[], path: string): ThemeTreeNode | null {
    const parts = path.split('/');
    let current: ThemeTreeNode | undefined;
    let searchList = nodes;

    for (const part of parts) {
        const expectedPath = current ? `${current.path}/${part}` : part;
        current = searchList.find((node) => node.path === expectedPath);
        if (!current) return null;
        searchList = current.children;
    }

    return current ?? null;
}

export function findThemeTreeNodeByThemeId(nodes: ThemeTreeNode[], themeId: string): ThemeTreeNode | null {
    const search = (nodeList: ThemeTreeNode[]): ThemeTreeNode | null => {
        for (const node of nodeList) {
            if (node.themeId === themeId) return node;
            const found = search(node.children);
            if (found) return found;
        }
        return null;
    };
    return search(nodes);
}

export function filterThemeTreeNodes(
    nodes: ThemeTreeNode[],
    predicate: (node: ThemeTreeNode) => boolean
): ThemeTreeNode[] {
    const filterNodes = (nodeList: ThemeTreeNode[]): ThemeTreeNode[] => nodeList
        .map((node) => {
            const filteredChildren = filterNodes(node.children);
            if (predicate(node) || filteredChildren.length > 0) {
                return { ...node, children: filteredChildren };
            }
            return null;
        })
        .filter((node): node is ThemeTreeNode => node !== null);

    return filterNodes(nodes);
}

export function searchThemeTreeNodes(nodes: ThemeTreeNode[], searchTerm: string): ThemeTreeNode[] {
    if (!searchTerm.trim()) return nodes;
    const term = searchTerm.toLowerCase();
    return filterThemeTreeNodes(nodes, (node) => (
        node.label.toLowerCase().includes(term) ||
        node.path.toLowerCase().includes(term)
    ));
}

export function getThemeAncestorPaths(path: string): string[] {
    const parts = path.split('/');
    const ancestors: string[] = [];
    let currentPath = '';

    for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        ancestors.push(currentPath);
    }

    return ancestors;
}

export function getThemeDescendantPaths(node: ThemeTreeNode): string[] {
    const descendants: string[] = [];

    const collect = (current: ThemeTreeNode | null | undefined): void => {
        if (!current) return;
        for (const child of current.children || []) {
            descendants.push(child.path);
            collect(child);
        }
    };

    collect(node);
    return descendants;
}

export function getThemeLeafNodes(nodes: ThemeTreeNode[]): ThemeTreeNode[] {
    const leaves: ThemeTreeNode[] = [];

    const collect = (nodeList: ThemeTreeNode[]): void => {
        for (const node of nodeList) {
            if (node.themeId !== null) leaves.push(node);
            collect(node.children);
        }
    };

    collect(nodes);
    return leaves;
}
