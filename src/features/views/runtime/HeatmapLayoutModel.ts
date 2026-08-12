export function shouldSkipHeatmapVerticalLayout(theme: string | undefined, normalizedCurrentView: string): boolean {
    if (!theme || theme === '__default__') return true;
    if (['年', '季'].includes(normalizedCurrentView)) return true;
    return normalizedCurrentView === '周';
}

export function resolveHeatmapVerticalLayout(args: {
    theme?: string;
    normalizedCurrentView: string;
    isDayView: boolean;
    containerWidth: number;
}): boolean | null {
    const { theme, normalizedCurrentView, isDayView, containerWidth } = args;
    if (shouldSkipHeatmapVerticalLayout(theme, normalizedCurrentView)) return null;
    const threshold = isDayView ? 320 : 600;
    return containerWidth < threshold;
}

export function applyHeatmapVerticalLayout(prev: Set<string>, theme: string, needsVertical: boolean): Set<string> {
    const next = new Set(prev);
    if (needsVertical) next.add(theme);
    else next.delete(theme);
    return next;
}

export function toggleHeatmapCollapsedTheme(prev: Set<string>, theme: string): Set<string> {
    const next = new Set(prev);
    if (next.has(theme)) next.delete(theme);
    else next.add(theme);
    return next;
}
