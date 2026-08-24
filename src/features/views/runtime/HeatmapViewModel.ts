import type { InputSettings, RecordViewItem } from '@core/types/public';
import { splitGoalPath } from '@core/goal/public';

export interface DayGoalEntry {
    goalPath: string;
    label: string;
    dataForGoal: Map<string, RecordViewItem[]>;
}

export interface DayGoalGroup {
    title: string;
    entries: DayGoalEntry[];
}

export interface HeatmapPresetContext {
    sourceBlockId?: string;
    templateId?: string;
    ratingOptions?: Array<{ value?: unknown; label?: unknown }>;
}

export interface GoalHeatmapEntry {
    presetKey?: string;
    templateId?: string;
    sourceBlockId?: string;
    ratingOptions?: Array<{ value?: unknown; label?: unknown }>;
    goalPath: string;
    label: string;
    count: number;
    dataForGoal: Map<string, RecordViewItem[]>;
}

export interface GoalHeatmapGroup {
    goalPath: string;
    label: string;
    count: number;
    entries: GoalHeatmapEntry[];
}

export function getGoalLeafLabel(goalPath: string): string {
    if (!goalPath || goalPath === '__default__') return '未分类';
    return splitGoalPath(goalPath).leafGoal || goalPath;
}

export function getGoalGroupTitle(goalPath: string): string {
    if (!goalPath || goalPath === '__default__') return '未分类';
    return splitGoalPath(goalPath).rootGoal || goalPath;
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
    const rawValue = String(candidate || '').trim();
    if (!rawValue) return '';
    const value = rawValue.startsWith('core.') ? rawValue : `core.${rawValue}`;

    const byId = inputSettings.blocks.find((block) => block.id === value);
    if (byId) return byId.id;

    const byCore = inputSettings.blocks.find((block) => block.recordTypeId === value);
    if (byCore) return byCore.id;

    // Settings expose human-readable Block names/category keys (e.g. “任务”).
    // Resolve those at the UI boundary instead of fabricating an invalid core.任务 id.
    const byDisplayName = inputSettings.blocks.find((block) => block.categoryKey === rawValue || block.name === rawValue);
    if (byDisplayName) return byDisplayName.id;

    if (configuredSourceBlockId && (value === configuredSourceBlockId || rawValue === configuredSourceBlockId)) {
        const habit = inputSettings.blocks.find((block) => block.recordTypeId === 'core.habit' || block.categoryKey === '打卡' || block.name === '打卡');
        if (habit) return habit.id;
    }

    return value;
}

/** Infer the dominant source Block for each canonical Goal path. */
export function inferHeatmapBlockIdByGoal(items: RecordViewItem[]): Map<string, string> {
    const result = new Map<string, string>();
    const counts = new Map<string, Map<string, number>>();

    for (const item of items) {
        const goalPath = String(item.goalPath || '').trim() || '__default__';
        const blockId = item.coreBlock ? `core.${String(item.coreBlock).replace(/^core\./, '')}` : '';
        if (!blockId) continue;
        if (!counts.has(goalPath)) counts.set(goalPath, new Map());
        const goalCounts = counts.get(goalPath)!;
        goalCounts.set(blockId, (goalCounts.get(blockId) || 0) + 1);
    }

    counts.forEach((goalCounts, goalPath) => {
        let bestBlockId = '';
        let bestCount = -1;
        goalCounts.forEach((count, blockId) => {
            if (count > bestCount) {
                bestCount = count;
                bestBlockId = blockId;
            }
        });
        if (bestBlockId) result.set(goalPath, bestBlockId);
    });

    return result;
}

export function resolveHeatmapCreateBlockId(params: {
    goalPath?: string;
    item?: RecordViewItem;
    sourceBlockId?: string;
    heatmapSourceBlockId?: string;
    inferredBlockIdByGoal: Map<string, string>;
    normalizeBlockId: (candidate?: string | null) => string;
}): string {
    const { goalPath, item, sourceBlockId, heatmapSourceBlockId, inferredBlockIdByGoal, normalizeBlockId } = params;
    const rowBlock = normalizeBlockId(sourceBlockId);
    const itemBlock = item?.coreBlock ? `core.${String(item.coreBlock).replace(/^core\./, '')}` : '';
    return rowBlock
        || normalizeBlockId(heatmapSourceBlockId)
        || normalizeBlockId(itemBlock)
        || normalizeBlockId(goalPath ? inferredBlockIdByGoal.get(goalPath) : undefined)
        || normalizeBlockId(inferredBlockIdByGoal.get('__default__'))
        || '';
}

export function buildDayGoalGroups(params: {
    goalPathsToTrack: string[];
    dataByGoalAndDate: Map<string, Map<string, RecordViewItem[]>>;
}): DayGoalGroup[] {
    const { goalPathsToTrack, dataByGoalAndDate } = params;
    const goalsToDisplay = goalPathsToTrack.length > 0 ? goalPathsToTrack : ['__default__'];
    const groups: DayGoalGroup[] = [];
    const groupMap = new Map<string, DayGoalGroup>();

    goalsToDisplay.forEach((goalPath) => {
        const title = getGoalGroupTitle(goalPath);
        const label = getGoalLeafLabel(goalPath);
        const entry: DayGoalEntry = {
            goalPath,
            label,
            dataForGoal: dataByGoalAndDate.get(goalPath) || new Map(),
        };

        const existingGroup = groupMap.get(title);
        if (existingGroup) {
            existingGroup.entries.push(entry);
            return;
        }

        const newGroup: DayGoalGroup = { title, entries: [entry] };
        groupMap.set(title, newGroup);
        groups.push(newGroup);
    });

    return groups;
}

export function createHeatmapPresetContext(entry: GoalHeatmapEntry): HeatmapPresetContext {
    return {
        sourceBlockId: entry.sourceBlockId,
        templateId: entry.templateId,
        ratingOptions: entry.ratingOptions,
    };
}
