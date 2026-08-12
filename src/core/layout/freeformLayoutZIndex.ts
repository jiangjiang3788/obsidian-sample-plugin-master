import type { ViewPlacement } from '@/core/view/ViewConfig';

/** 返回目标卡片置顶后的 placement；未改变其它卡片的持久化数据。 */
export function bringViewPlacementToFront(placements: Record<string, ViewPlacement>, viewInstanceId: string): ViewPlacement | undefined {
    const target = placements[viewInstanceId];
    if (!target) return undefined;
    const targetZIndex = target.zIndex ?? 0;
    const maxZIndex = Object.values(placements).reduce((maxValue, placement) => Math.max(maxValue, placement.zIndex ?? 0), 0);
    const hasPeerAtOrAbove = Object.entries(placements).some(([id, placement]) => id !== viewInstanceId && (placement.zIndex ?? 0) >= targetZIndex);
    if (!hasPeerAtOrAbove) return target;
    return { ...target, zIndex: maxZIndex + 1 };
}

/**
 * 将自由布局层级压缩为 1..N。排序优先使用当前 zIndex，层级相同或缺失时
 * 使用 Layout.viewInstanceIds 的稳定顺序，避免长期置顶后 zIndex 无界增长。
 */
export function normalizeViewPlacementZIndices(
    placements: Record<string, ViewPlacement>,
    preferredOrder: string[] = Object.keys(placements)
): Record<string, ViewPlacement> {
    const order = new Map(preferredOrder.map((id, index) => [id, index]));
    const entries = Object.entries(placements).sort(([leftId, left], [rightId, right]) => {
        const zDiff = (left.zIndex ?? 0) - (right.zIndex ?? 0);
        if (zDiff !== 0) return zDiff;
        return (order.get(leftId) ?? Number.MAX_SAFE_INTEGER) - (order.get(rightId) ?? Number.MAX_SAFE_INTEGER);
    });

    let changed = false;
    const normalized: Record<string, ViewPlacement> = {};
    entries.forEach(([id, placement], index) => {
        const zIndex = index + 1;
        if (placement.zIndex !== zIndex) changed = true;
        normalized[id] = placement.zIndex === zIndex ? placement : { ...placement, zIndex };
    });

    return changed ? normalized : placements;
}

/** 将目标卡片置于最上层，并在同一次操作中归一化所有卡片层级。 */
export function bringViewPlacementsToFront(
    placements: Record<string, ViewPlacement>,
    viewInstanceId: string,
    preferredOrder: string[] = Object.keys(placements)
): Record<string, ViewPlacement> {
    if (!placements[viewInstanceId]) return placements;

    const normalized = normalizeViewPlacementZIndices(placements, preferredOrder);
    const orderedIds = Object.entries(normalized)
        .sort(([, left], [, right]) => (left.zIndex ?? 0) - (right.zIndex ?? 0))
        .map(([id]) => id);
    const topId = orderedIds[orderedIds.length - 1];
    if (topId === viewInstanceId) return normalized;

    const withoutTarget = orderedIds.filter((id) => id !== viewInstanceId);
    const nextOrder = [...withoutTarget, viewInstanceId];
    let changed = normalized !== placements;
    const next: Record<string, ViewPlacement> = {};
    nextOrder.forEach((id, index) => {
        const placement = normalized[id];
        const zIndex = index + 1;
        if (placement.zIndex !== zIndex) changed = true;
        next[id] = placement.zIndex === zIndex ? placement : { ...placement, zIndex };
    });

    return changed ? next : placements;
}
