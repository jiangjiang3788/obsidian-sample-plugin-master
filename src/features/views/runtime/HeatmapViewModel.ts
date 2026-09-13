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
    sourceRecordTypeId?: string;
    templateId?: string;
    ratingOptions?: Array<{ value?: unknown; label?: unknown }>;
}

export interface GoalHeatmapEntry {
    presetKey?: string;
    templateId?: string;
    sourceRecordTypeId?: string;
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

export function normalizeHeatmapRecordTypeId(params: {
    candidate?: string | null;
    inputSettings: InputSettings;
    configuredSourceRecordTypeId?: string;
}): string {
    const { candidate, inputSettings, configuredSourceRecordTypeId } = params;
    const rawValue = String(candidate || '').trim();
    if (!rawValue) return '';
    const value = rawValue.startsWith('core.') ? rawValue : `core.${rawValue}`;

    const byId = inputSettings.recordTypes.find((recordType) => recordType.id === value);
    if (byId) return byId.id;

    const byCore = inputSettings.recordTypes.find((recordType) => recordType.recordTypeId === value);
    if (byCore) return byCore.id;

    // Resolve a human-readable Record Type name at the UI boundary.
    const byDisplayName = inputSettings.recordTypes.find((recordType) => recordType.name === rawValue);
    if (byDisplayName) return byDisplayName.id;

    if (configuredSourceRecordTypeId && (value === configuredSourceRecordTypeId || rawValue === configuredSourceRecordTypeId)) {
        const habit = inputSettings.recordTypes.find((recordType) => recordType.recordTypeId === 'core.habit' || recordType.name === '打卡');
        if (habit) return habit.id;
    }

    return value;
}

/** Infer the dominant source Record Type for each canonical Goal path. */
export function inferHeatmapRecordTypeIdByGoal(items: RecordViewItem[]): Map<string, string> {
    const result = new Map<string, string>();
    const counts = new Map<string, Map<string, number>>();

    for (const item of items) {
        const goalPath = String(item.goalPath || '').trim() || '__default__';
        const recordTypeId = item.recordType ? `core.${String(item.recordType).replace(/^core\./, '')}` : '';
        if (!recordTypeId) continue;
        if (!counts.has(goalPath)) counts.set(goalPath, new Map());
        const goalCounts = counts.get(goalPath)!;
        goalCounts.set(recordTypeId, (goalCounts.get(recordTypeId) || 0) + 1);
    }

    counts.forEach((goalCounts, goalPath) => {
        let bestRecordTypeId = '';
        let bestCount = -1;
        goalCounts.forEach((count, recordTypeId) => {
            if (count > bestCount) {
                bestCount = count;
                bestRecordTypeId = recordTypeId;
            }
        });
        if (bestRecordTypeId) result.set(goalPath, bestRecordTypeId);
    });

    return result;
}

export function resolveHeatmapCreateRecordTypeId(params: {
    goalPath?: string;
    item?: RecordViewItem;
    sourceRecordTypeId?: string;
    heatmapSourceRecordTypeId?: string;
    inferredRecordTypeIdByGoal: Map<string, string>;
    normalizeRecordTypeId: (candidate?: string | null) => string;
}): string {
    const { goalPath, item, sourceRecordTypeId, heatmapSourceRecordTypeId, inferredRecordTypeIdByGoal, normalizeRecordTypeId } = params;
    const rowBlock = normalizeRecordTypeId(sourceRecordTypeId);
    const itemBlock = item?.recordType ? `core.${String(item.recordType).replace(/^core\./, '')}` : '';
    return rowBlock
        || normalizeRecordTypeId(heatmapSourceRecordTypeId)
        || normalizeRecordTypeId(itemBlock)
        || normalizeRecordTypeId(goalPath ? inferredRecordTypeIdByGoal.get(goalPath) : undefined)
        || normalizeRecordTypeId(inferredRecordTypeIdByGoal.get('__default__'))
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
        sourceRecordTypeId: entry.sourceRecordTypeId,
        templateId: entry.templateId,
        ratingOptions: entry.ratingOptions,
    };
}
