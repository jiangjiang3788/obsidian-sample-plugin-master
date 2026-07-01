import type { ThemeDefinition } from '@/core/types/schema';
import type { BuildThemeTreeOptions, ThemeTreeNode } from './ThemeTreeTypes';

function getOrder(node: ThemeTreeNode): number | null {
    const raw = node.theme?.order;
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function createNode(theme: ThemeDefinition, path: string, label: string, depth: number, isLeaf: boolean, parentNode: ThemeTreeNode | null): ThemeTreeNode {
    return {
        id: path,
        label,
        path,
        depth,
        themeId: isLeaf ? theme.id : null,
        theme: isLeaf ? theme : null,
        parentId: parentNode?.id ?? null,
        children: [],
    };
}

function compareThemeTreeNodes(sortBy: BuildThemeTreeOptions['sortBy'], a: ThemeTreeNode, b: ThemeTreeNode): number {
    if (sortBy === 'label') {
        return a.label.localeCompare(b.label);
    }
    if (sortBy === 'order') {
        const ao = getOrder(a);
        const bo = getOrder(b);
        if (ao !== null && bo !== null && ao !== bo) return ao - bo;
        if (ao !== null && bo === null) return -1;
        if (ao === null && bo !== null) return 1;
    }
    return a.path.localeCompare(b.path);
}

function sortNodes(nodes: ThemeTreeNode[], sortBy: BuildThemeTreeOptions['sortBy']): void {
    nodes.sort((a, b) => compareThemeTreeNodes(sortBy, a, b));
    nodes.forEach((node) => sortNodes(node.children, sortBy));
}

function buildTreeWithVirtualNodes(themes: ThemeDefinition[], sortBy: BuildThemeTreeOptions['sortBy']): ThemeTreeNode[] {
    const roots: ThemeTreeNode[] = [];
    const nodeMap = new Map<string, ThemeTreeNode>();
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
                const newNode = createNode(theme, currentPath, part, i, isLeaf, parentNode);
                node = newNode;
                nodeMap.set(currentPath, newNode);

                if (parentNode) {
                    if (!parentNode.children.some((child) => child.id === newNode.id)) {
                        parentNode.children.push(newNode);
                    }
                } else if (!roots.some((root) => root.id === newNode.id)) {
                    roots.push(newNode);
                }
            } else if (isLeaf) {
                node.themeId = theme.id;
                node.theme = theme;
            }

            parentNode = node;
        }
    }

    sortNodes(roots, sortBy);
    return roots;
}

function buildTreeWithRealNodesOnly(themes: ThemeDefinition[], sortBy: BuildThemeTreeOptions['sortBy']): ThemeTreeNode[] {
    const themeByPath = new Map<string, ThemeDefinition>();
    for (const theme of themes) themeByPath.set(theme.path, theme);

    const nodeByPath = new Map<string, ThemeTreeNode>();
    for (const theme of themes) {
        const parts = theme.path.split('/');
        const label = parts[parts.length - 1] ?? theme.path;
        nodeByPath.set(theme.path, {
            id: theme.path,
            label,
            path: theme.path,
            depth: 0,
            themeId: theme.id,
            theme,
            parentId: null,
            children: [],
        });
    }

    const roots: ThemeTreeNode[] = [];
    const rootIds = new Set<string>();
    for (const theme of themes) {
        const node = nodeByPath.get(theme.path);
        if (!node) continue;

        const parts = theme.path.split('/');
        let parentPath: string | null = null;
        if (parts.length > 1) {
            for (let i = parts.length - 1; i >= 1; i--) {
                const candidate = parts.slice(0, i).join('/');
                if (themeByPath.has(candidate)) {
                    parentPath = candidate;
                    break;
                }
            }
        }

        if (parentPath) {
            const parentNode = nodeByPath.get(parentPath);
            if (parentNode) {
                node.parentId = parentNode.id;
                if (!parentNode.children.some((child) => child.id === node.id)) {
                    parentNode.children.push(node);
                }
                continue;
            }
        }

        if (!rootIds.has(node.id)) {
            roots.push(node);
            rootIds.add(node.id);
        }
    }

    const setDepth = (nodes: ThemeTreeNode[], depth: number): void => {
        for (const node of nodes) {
            node.depth = depth;
            if (node.children.length > 0) setDepth(node.children, depth + 1);
        }
    };
    setDepth(roots, 0);
    sortNodes(roots, sortBy);
    return roots;
}

export function buildThemeTreeNodes(
    themes: ThemeDefinition[],
    options: BuildThemeTreeOptions = {}
): ThemeTreeNode[] {
    const { sortBy = 'path', createVirtualNodes = true } = options;
    if (!themes || themes.length === 0) return [];
    return createVirtualNodes
        ? buildTreeWithVirtualNodes(themes, sortBy)
        : buildTreeWithRealNodesOnly(themes, sortBy);
}
