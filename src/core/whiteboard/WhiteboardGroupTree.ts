export interface WhiteboardGroupTreeNode {
    id: string;
    parentGroupId?: string;
}

export const WHITEBOARD_WORKBENCH_MAX_DEPTH = 4;

export function getWhiteboardGroupById<T extends WhiteboardGroupTreeNode>(groups: readonly T[]): Map<string, T> {
    return new Map(groups.map((group) => [group.id, group]));
}

export function getWhiteboardGroupDepth(groups: readonly WhiteboardGroupTreeNode[], groupId: string): number {
    const byId = getWhiteboardGroupById(groups);
    let current = byId.get(groupId);
    let depth = 0;
    const visited = new Set<string>();
    while (current) {
        if (visited.has(current.id)) return Number.POSITIVE_INFINITY;
        visited.add(current.id);
        depth += 1;
        current = current.parentGroupId ? byId.get(current.parentGroupId) : undefined;
    }
    return depth;
}

export function getWhiteboardGroupPathIds(groups: readonly WhiteboardGroupTreeNode[], groupId: string): string[] {
    const byId = getWhiteboardGroupById(groups);
    const path: string[] = [];
    let current = byId.get(groupId);
    const visited = new Set<string>();
    while (current && !visited.has(current.id)) {
        visited.add(current.id);
        path.unshift(current.id);
        current = current.parentGroupId ? byId.get(current.parentGroupId) : undefined;
    }
    return path;
}

export function getWhiteboardGroupDescendantIds(groups: readonly WhiteboardGroupTreeNode[], groupId: string): Set<string> {
    const descendants = new Set<string>();
    let changed = true;
    while (changed) {
        changed = false;
        groups.forEach((group) => {
            if (group.id === groupId || descendants.has(group.id)) return;
            if (group.parentGroupId === groupId || (group.parentGroupId && descendants.has(group.parentGroupId))) {
                descendants.add(group.id);
                changed = true;
            }
        });
    }
    return descendants;
}

export function getWhiteboardGroupSubtreeHeight(groups: readonly WhiteboardGroupTreeNode[], groupId: string): number {
    const byParent = new Map<string, string[]>();
    groups.forEach((group) => {
        if (!group.parentGroupId) return;
        const children = byParent.get(group.parentGroupId) ?? [];
        children.push(group.id);
        byParent.set(group.parentGroupId, children);
    });
    const visit = (id: string, visited: Set<string>): number => {
        if (visited.has(id)) return Number.POSITIVE_INFINITY;
        const nextVisited = new Set(visited); nextVisited.add(id);
        const children = byParent.get(id) ?? [];
        return 1 + children.reduce((max, childId) => Math.max(max, visit(childId, nextVisited)), 0);
    };
    return visit(groupId, new Set());
}

export function canNestWhiteboardGroup(
    groups: readonly WhiteboardGroupTreeNode[],
    groupId: string,
    parentGroupId: string | null,
    maxDepth = WHITEBOARD_WORKBENCH_MAX_DEPTH,
): boolean {
    if (parentGroupId === groupId) return false;
    if (!parentGroupId) return getWhiteboardGroupSubtreeHeight(groups, groupId) <= maxDepth;
    const byId = getWhiteboardGroupById(groups);
    if (!byId.has(groupId) || !byId.has(parentGroupId)) return false;
    if (getWhiteboardGroupDescendantIds(groups, groupId).has(parentGroupId)) return false;
    const parentDepth = getWhiteboardGroupDepth(groups, parentGroupId);
    const subtreeHeight = getWhiteboardGroupSubtreeHeight(groups, groupId);
    return Number.isFinite(parentDepth) && Number.isFinite(subtreeHeight) && parentDepth + subtreeHeight <= maxDepth;
}

export function isWhiteboardGroupInsideContainer(
    groups: readonly WhiteboardGroupTreeNode[],
    groupId: string,
    containerGroupId: string | null,
): boolean {
    if (!containerGroupId) return true;
    return groupId === containerGroupId || getWhiteboardGroupPathIds(groups, groupId).includes(containerGroupId);
}
