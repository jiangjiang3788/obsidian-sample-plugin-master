// Goal-only Heatmap projection.

import type { RecordViewItem, ViewInstance, InputSettings, TemplateFieldOption } from '@core/types/public';
import type { GoalDefinition, GoalSettings, GoalTemplateStorageRow } from '@core/goal/public';
import type { HeatmapRatingOptionLike } from '@core/utils/public';
import { createGoalOrderIndex, normalizeGoalPath, splitGoalPath, UNASSIGNED_GOAL_KEY } from '@core/goal/public';

export interface HeatmapGoalEntry {
    presetKey: string;
    templateId?: string;
    sourceBlockId?: string;
    ratingOptions?: HeatmapRatingOptionLike[];
    presetOriginalIndex?: number;
    goalPath: string;
    label: string;
    count: number;
    dataForGoal: Map<string, RecordViewItem[]>;
}

export interface HeatmapGoalGroup {
    goalPath: string;
    label: string;
    count: number;
    entries: HeatmapGoalEntry[];
}

type HeatmapViewConfigLike = {
    goalPaths?: unknown;
};

type HeatmapGoalTemplateLike = GoalTemplateStorageRow & { blockId?: unknown; id?: unknown };
type HeatmapRatingFieldLike = {
    type?: unknown;
    semantic?: unknown;
    key?: unknown;
    label?: unknown;
    options?: TemplateFieldOption[];
};

interface PresetMeta {
    key: string;
    id: string;
    goalPath: string;
    coreBlockId: string;
    ratingOptions: HeatmapRatingOptionLike[];
    order: number;
}

function firstText(value: unknown): string {
    if (Array.isArray(value)) {
        for (const item of value) {
            const text = firstText(item);
            if (text) return text;
        }
        return '';
    }
    return value == null ? '' : String(value).trim();
}

function dateKeyOf(item: RecordViewItem): string {
    return String(item.date || '').trim();
}

function itemGoalPath(item: RecordViewItem): string {
    return normalizeGoalPath(String(item.goalPath || item.extra?.['目标'] || ''));
}

function itemCoreBlock(item: RecordViewItem): string {
    const raw = firstText(item.coreBlock) || firstText(item.categoryKey);
    if (raw === 'habit' || raw === '打卡') return 'core.habit';
    if (raw === 'task' || raw === '任务') return 'core.task';
    return raw.startsWith('core.') ? raw : raw;
}

function extractRatingOptions(template: GoalTemplateStorageRow | null | undefined): HeatmapRatingOptionLike[] {
    const fields: HeatmapRatingFieldLike[] = Array.isArray(template?.fields) ? template.fields : [];
    const ratingField = fields.find((field) => field?.type === 'rating' || field?.semantic === 'rating' || field?.key === '评分' || field?.label === '评分');
    return Array.isArray(ratingField?.options)
        ? ratingField.options
            .map((option) => ({ value: option?.value, label: option?.label }))
            .filter((option) => option.value !== undefined || option.label !== undefined)
        : [];
}

function buildPresetLookups(goalSettings: GoalSettings | undefined): {
    byGoalAndBlock: Map<string, PresetMeta>;
    allHabits: PresetMeta[];
} {
    const byGoalAndBlock = new Map<string, PresetMeta>();
    const allHabits: PresetMeta[] = [];
    for (const [index, raw] of (goalSettings?.goalTemplates || []).entries()) {
        const template: HeatmapGoalTemplateLike = raw;
        const goalPath = normalizeGoalPath(firstText(template.goalPath));
        const coreBlockId = firstText(template.coreBlockId) || firstText(template.blockId);
        if (!goalPath || !coreBlockId || template.enabled === false) continue;
        const id = firstText(template.id) || `${goalPath}\u0000${coreBlockId}`;
        const meta: PresetMeta = {
            key: id,
            id,
            goalPath,
            coreBlockId,
            ratingOptions: extractRatingOptions(template),
            order: index,
        };
        byGoalAndBlock.set(`${goalPath}\u0000${coreBlockId}`, meta);
        if (coreBlockId === 'core.habit') allHabits.push(meta);
    }
    return { byGoalAndBlock, allHabits };
}

function rowLabel(goalPath: string): string {
    return splitGoalPath(goalPath).leafGoal || goalPath || '未归属';
}

function rootPath(goalPath: string): string {
    return splitGoalPath(goalPath).rootGoal || goalPath || UNASSIGNED_GOAL_KEY;
}

export function buildHeatmapViewModel(params: {
    items: RecordViewItem[];
    module: ViewInstance;
    inputSettings: InputSettings;
    goals?: GoalDefinition[];
    goalSettings?: GoalSettings;
}): {
    goalPathsToTrack: string[];
    dataByGoalAndDate: Map<string, Map<string, RecordViewItem[]>>;
    goalGroups: HeatmapGoalGroup[];
} {
    const { items, module, goals = [], goalSettings } = params;
    void params.inputSettings;
    const config = (module.viewConfig || {}) as HeatmapViewConfigLike;
    const configured = Array.isArray(config.goalPaths)
        ? config.goalPaths.map((value) => normalizeGoalPath(String(value))).filter(Boolean)
        : [];
    const configuredSet = new Set(configured);

    const inferred = new Set<string>();
    for (const item of items) {
        const path = itemGoalPath(item);
        if (path) inferred.add(path);
    }
    const goalPathsToTrack = configured.length ? configured : [...inferred];
    const dataByGoalAndDate = new Map<string, Map<string, RecordViewItem[]>>();
    for (const path of goalPathsToTrack) dataByGoalAndDate.set(path, new Map());

    const goalByPath = new Map<string, GoalDefinition>();
    for (const goal of goals) {
        const path = normalizeGoalPath(goal.path);
        if (path) goalByPath.set(path, goal);
    }

    const lookups = buildPresetLookups(goalSettings);
    const groupMap = new Map<string, HeatmapGoalGroup>();

    function ensureGroup(path: string): HeatmapGoalGroup {
        const root = rootPath(path);
        let group = groupMap.get(root);
        if (!group) {
            const goal = goalByPath.get(root);
            group = { goalPath: root, label: goal?.path ? rowLabel(goal.path) : rowLabel(root), count: 0, entries: [] };
            groupMap.set(root, group);
        }
        return group;
    }

    function ensureEntry(path: string, preset?: PresetMeta | null): HeatmapGoalEntry {
        const group = ensureGroup(path);
        let entry = group.entries.find((candidate) => candidate.goalPath === path);
        if (!entry) {
            entry = {
                presetKey: preset?.key || `${path}\u0000core.habit`,
                templateId: preset?.id || undefined,
                sourceBlockId: preset?.coreBlockId,
                ratingOptions: preset?.ratingOptions || [],
                presetOriginalIndex: preset?.order,
                goalPath: path,
                label: rowLabel(path),
                count: 0,
                dataForGoal: dataByGoalAndDate.get(path) || new Map(),
            };
            dataByGoalAndDate.set(path, entry.dataForGoal);
            group.entries.push(entry);
        }
        return entry;
    }

    for (const preset of lookups.allHabits) {
        if (configuredSet.size && !configuredSet.has(preset.goalPath)) continue;
        ensureEntry(preset.goalPath, preset);
    }

    for (const item of items) {
        const date = dateKeyOf(item);
        const path = itemGoalPath(item);
        if (!date || !path) continue;
        if (configuredSet.size && !configuredSet.has(path)) continue;
        const coreBlockId = itemCoreBlock(item);
        const preset = lookups.byGoalAndBlock.get(`${path}\u0000${coreBlockId}`) || null;
        const entry = ensureEntry(path, preset);
        const group = ensureGroup(path);
        entry.count += 1;
        group.count += 1;
        const dayItems = entry.dataForGoal.get(date) || [];
        entry.dataForGoal.set(date, [...dayItems, item]);
    }

    const goalOrder = createGoalOrderIndex(goals);
    const goalGroups = [...groupMap.values()]
        .map((group) => ({
            ...group,
            entries: [...group.entries].sort((a, b) => {
                const order = (a.presetOriginalIndex ?? Number.MAX_SAFE_INTEGER) - (b.presetOriginalIndex ?? Number.MAX_SAFE_INTEGER);
                return order || goalOrder.compareGoalPaths(a.goalPath, b.goalPath);
            }),
        }))
        .sort((a, b) => goalOrder.compareGoalPaths(a.goalPath, b.goalPath));

    return { goalPathsToTrack, dataByGoalAndDate, goalGroups };
}
