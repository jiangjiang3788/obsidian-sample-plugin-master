import type { InputSettings, Item } from '@core/public';
import { getItemThemePath, parsePath } from '@core/public';

export interface DayThemeEntry {
    themePath: string;
    label: string;
    dataForTheme: Map<string, Item[]>;
}

export interface DayThemeGroup {
    title: string;
    entries: DayThemeEntry[];
}

export interface HeatmapPresetContext {
    sourceBlockId?: string;
    goalId?: string;
    templateId?: string;
    templateVariantId?: string;
    ratingOptions?: Array<{ value?: unknown; label?: unknown }>;
}

export interface GoalHeatmapThemeEntry {
    presetKey?: string;
    templateId?: string;
    templateVariantId?: string;
    sourceBlockId?: string;
    goalId?: string;
    ratingOptions?: Array<{ value?: unknown; label?: unknown }>;
    themePath: string;
    label: string;
    count: number;
    dataForTheme: Map<string, Item[]>;
}

export interface GoalHeatmapGroup {
    goalPath: string;
    label: string;
    count: number;
    entries: GoalHeatmapThemeEntry[];
}

export function getThemeLeafLabel(themePath: string): string {
    if (!themePath || themePath === '__default__') return '未分类';
    const segments = parsePath(themePath);
    const leaf = segments[segments.length - 1];
    return leaf?.name || themePath;
}

export function getThemeGroupTitle(themePath: string): string {
    if (!themePath || themePath === '__default__') return '未分类';
    const segments = parsePath(themePath);
    return segments[0]?.name || themePath;
}

export function inferHeatmapThemePaths(items: Item[]): string[] {
    const set = new Set<string>();
    for (const item of items) {
        const themePath = getItemThemePath(item);
        if (themePath) set.add(themePath);
    }
    return Array.from(set);
}

export function selectHeatmapThemesToTrack(params: {
    injectedThemesToTrack?: string[];
    configuredThemePaths?: string[];
    inferredThemePaths: string[];
}): string[] {
    const { injectedThemesToTrack, configuredThemePaths, inferredThemePaths } = params;
    if (injectedThemesToTrack) return injectedThemesToTrack;
    return configuredThemePaths && configuredThemePaths.length > 0
        ? configuredThemePaths
        : inferredThemePaths;
}

export function filterGoalHeatmapGroups(groups?: GoalHeatmapGroup[]): GoalHeatmapGroup[] {
    return (groups || []).filter((group) => group && Array.isArray(group.entries) && group.entries.length > 0);
}

export function normalizeHeatmapBlockId(params: {
    candidate?: string | null;
    inputSettings: InputSettings;
    configuredSourceBlockId?: string;
}): string {
    const { candidate, inputSettings, configuredSourceBlockId } = params;
    const value = String(candidate || '').trim();
    if (!value) return '';

    const byId = inputSettings.blocks.find((block) => block.id === value);
    if (byId) return byId.id;

    const byCore = inputSettings.blocks.find((block) => block.coreBlockId === value);
    if (byCore) return byCore.id;

    const byCategory = inputSettings.blocks.find((block) => block.categoryKey === value || block.name === value);
    if (byCategory) return byCategory.id;

    // 旧数据里常见 sourceBlockId 已经不存在；打卡视图优先回退到 core.habit。
    if (configuredSourceBlockId && value === configuredSourceBlockId) {
        const habit = inputSettings.blocks.find((block) => block.coreBlockId === 'core.habit' || block.categoryKey === '打卡' || block.name === '打卡');
        if (habit) return habit.id;
    }

    return value;
}

export function inferHeatmapBlockIdByTheme(items: Item[]): Map<string, string> {
    const result = new Map<string, string>();
    const counts = new Map<string, Map<string, number>>();

    for (const item of items) {
        const themePath = getItemThemePath(item);
        const themeKey = themePath || '__default__';
        const blockId = typeof item?.templateId === 'string' && item.templateId.trim().length > 0
            ? item.templateId
            : (typeof item?.categoryKey === 'string' && item.categoryKey.trim().length > 0 ? item.categoryKey : '');
        if (!blockId) continue;
        if (!counts.has(themeKey)) counts.set(themeKey, new Map());
        const themeCounts = counts.get(themeKey)!;
        themeCounts.set(blockId, (themeCounts.get(blockId) || 0) + 1);
    }

    counts.forEach((themeCounts, themeKey) => {
        let bestBlockId = '';
        let bestCount = -1;
        themeCounts.forEach((count, blockId) => {
            if (count > bestCount) {
                bestCount = count;
                bestBlockId = blockId;
            }
        });
        if (bestBlockId) result.set(themeKey, bestBlockId);
    });

    return result;
}

export function resolveHeatmapCreateBlockId(params: {
    themePath?: string;
    item?: Item;
    sourceBlockId?: string;
    heatmapSourceBlockId?: string;
    inferredBlockIdByTheme: Map<string, string>;
    normalizeBlockId: (candidate?: string | null) => string;
}): string {
    const { themePath, item, sourceBlockId, heatmapSourceBlockId, inferredBlockIdByTheme, normalizeBlockId } = params;
    const rowBlock = normalizeBlockId(sourceBlockId);
    const itemBlock = item?.coreBlock || item?.templateId || item?.categoryKey;
    return rowBlock
        || normalizeBlockId(heatmapSourceBlockId)
        || normalizeBlockId(itemBlock)
        || normalizeBlockId(themePath ? inferredBlockIdByTheme.get(themePath) : undefined)
        || normalizeBlockId(inferredBlockIdByTheme.get('__default__'))
        || '';
}

export function buildDayThemeGroups(params: {
    themesToTrack: string[];
    dataByThemeAndDate: Map<string, Map<string, Item[]>>;
}): DayThemeGroup[] {
    const { themesToTrack, dataByThemeAndDate } = params;
    const themesToDisplay = themesToTrack.length > 0 ? themesToTrack : ['__default__'];
    const groups: DayThemeGroup[] = [];
    const groupMap = new Map<string, DayThemeGroup>();

    themesToDisplay.forEach((themePath) => {
        const title = getThemeGroupTitle(themePath);
        const label = getThemeLeafLabel(themePath);
        const entry: DayThemeEntry = {
            themePath,
            label,
            dataForTheme: dataByThemeAndDate.get(themePath) || new Map(),
        };

        const existingGroup = groupMap.get(title);
        if (existingGroup) {
            existingGroup.entries.push(entry);
            return;
        }

        const newGroup: DayThemeGroup = { title, entries: [entry] };
        groupMap.set(title, newGroup);
        groups.push(newGroup);
    });

    return groups;
}

export function createHeatmapPresetContext(entry: GoalHeatmapThemeEntry): HeatmapPresetContext {
    return {
        sourceBlockId: entry.sourceBlockId,
        goalId: entry.goalId,
        templateId: entry.templateId,
        templateVariantId: entry.templateVariantId,
        ratingOptions: entry.ratingOptions,
    };
}
