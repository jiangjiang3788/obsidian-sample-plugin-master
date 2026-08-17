export function shouldSkipHeatmapVerticalLayout(goalPath: string | undefined, normalizedCurrentView: string): boolean {
    if (!goalPath || goalPath === '__default__') return true;
    if (['年', '季'].includes(normalizedCurrentView)) return true;
    return normalizedCurrentView === '周';
}

export function resolveHeatmapVerticalLayout(args: {
    goalPath?: string;
    normalizedCurrentView: string;
    isDayView: boolean;
    containerWidth: number;
}): boolean | null {
    const { goalPath, normalizedCurrentView, isDayView, containerWidth } = args;
    if (shouldSkipHeatmapVerticalLayout(goalPath, normalizedCurrentView)) return null;
    const threshold = isDayView ? 320 : 600;
    return containerWidth < threshold;
}

export function applyHeatmapVerticalLayout(prev: Set<string>, goalPath: string, needsVertical: boolean): Set<string> {
    const next = new Set(prev);
    if (needsVertical) next.add(goalPath);
    else next.delete(goalPath);
    return next;
}

export function toggleHeatmapCollapsedGoal(prev: Set<string>, goalPath: string): Set<string> {
    const next = new Set(prev);
    if (next.has(goalPath)) next.delete(goalPath);
    else next.add(goalPath);
    return next;
}
