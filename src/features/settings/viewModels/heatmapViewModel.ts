// src/features/settings/viewModels/heatmapViewModel.ts

import type { Item, ViewInstance, InputSettings, GoalDefinition, GoalSettings } from '@core/public';
import { buildThemeDataMap, buildThemesByPathMap, getItemThemePath, getItemGoalKey, getItemGoalLabel, UNASSIGNED_GOAL_KEY, splitGoalPath } from '@core/public';

/**
 * Phase2: shared/ui 纯化试点（HeatmapView）
 * 把“主题推断/主题选择/数据聚合”从 shared/ui 挪到 feature 层，
 * shared/ui 仅负责渲染 + 交互。
 */
export interface HeatmapGoalThemeEntry {
    /** 分组实际依据：优先为目标预设/模板，其次才回退到主题。 */
    presetKey: string;
    /** 仍然保留主题，用于图标、默认主题和统计二级维度。 */
    themePath: string;
    /** 行标题：优先预设名，例如 睡眠任务/运动打卡；没有预设时用主题叶子。 */
    label: string;
    count: number;
    dataForTheme: Map<string, Item[]>;
}

export interface HeatmapGoalGroup {
    goalPath: string;
    label: string;
    count: number;
    entries: HeatmapGoalThemeEntry[];
}

function themeLeaf(path: string): string {
    const value = String(path || '').trim();
    if (!value || value === '__default__') return '未设置主题';
    const parts = value.split('/').map((part) => part.trim()).filter(Boolean);
    return parts[parts.length - 1] || value;
}

function firstText(value: unknown): string {
    if (Array.isArray(value)) {
        for (const item of value) {
            const text = firstText(item);
            if (text) return text;
        }
        return '';
    }
    if (value == null) return '';
    return String(value).trim();
}

function readExtraText(item: Item, key: string): string {
    return firstText((item as any)?.extra?.[key]);
}

function itemTemplateId(item: Item): string {
    return firstText((item as any).templateId)
        || readExtraText(item, '模板ID')
        || readExtraText(item, 'templateId');
}

function itemTemplateVariantId(item: Item): string {
    return firstText((item as any).templateVariantId)
        || firstText((item as any).goalTemplateVariantId)
        || readExtraText(item, 'templateVariantId')
        || readExtraText(item, 'goalTemplateVariantId')
        || readExtraText(item, '预设ID');
}

function itemCoreBlock(item: Item): string {
    const raw = firstText((item as any).coreBlock)
        || readExtraText(item, '核心Block')
        || firstText((item as any).categoryKey)
        || '';
    if (raw === 'habit' || raw === '打卡') return 'core.habit';
    if (raw === 'task' || raw === '任务') return 'core.task';
    if (raw.startsWith('core.')) return raw;
    return raw;
}

interface PresetMeta {
    key: string;
    id: string;
    goalId: string;
    goalPath: string;
    goalLabel: string;
    coreBlockId: string;
    variantId: string;
    label: string;
    themePath: string;
}

function buildPresetLookups(goalSettings: GoalSettings | undefined, goals: GoalDefinition[]): {
    byTemplateId: Map<string, PresetMeta>;
    byLegacyOverrideId: Map<string, PresetMeta>;
    byGoalBlockVariant: Map<string, PresetMeta>;
    goalPathById: Map<string, string>;
    goalLabelById: Map<string, string>;
    allPresets: PresetMeta[];
} {
    const goalPathById = new Map<string, string>();
    const goalLabelById = new Map<string, string>();
    for (const goal of goals || []) {
        const normalized = splitGoalPath(goal.goalPath || goal.title || goal.id).goalPath || goal.goalPath || goal.title || goal.id;
        goalPathById.set(goal.id, normalized);
        goalLabelById.set(goal.id, goal.title || splitGoalPath(normalized).leafGoal || normalized);
    }

    const byTemplateId = new Map<string, PresetMeta>();
    const byLegacyOverrideId = new Map<string, PresetMeta>();
    const byGoalBlockVariant = new Map<string, PresetMeta>();
    const allPresets: PresetMeta[] = [];

    for (const raw of goalSettings?.goalBlockBindings || []) {
        const template: any = raw || {};
        const id = firstText(template.id);
        const goalId = firstText(template.goalId);
        const coreBlockId = firstText(template.coreBlockId) || firstText(template.blockId);
        const variantId = firstText(template.variantId) || 'default';
        const defaults = template.defaultValues || {};
        const goalPath = goalPathById.get(goalId) || firstText(defaults.goalPath) || firstText(defaults['目标']) || goalId;
        const goalLabel = goalLabelById.get(goalId) || splitGoalPath(goalPath).leafGoal || goalPath;
        const rawThemePath = firstText(defaults.themePath);
        const themePath = rawThemePath && !rawThemePath.includes('{{')
            ? rawThemePath
            : (firstText(defaults['主题']) || firstText(defaults.legacyThemePath));
        const label = firstText(template.name) || firstText(template.templateName) || themeLeaf(themePath) || variantId || '默认打卡';
        const key = id || `${goalId}:${coreBlockId}:${variantId}`;
        const meta: PresetMeta = { key, id, goalId, goalPath, goalLabel, coreBlockId, variantId, label, themePath };
        allPresets.push(meta);
        if (id) byTemplateId.set(id, meta);
        const legacyOverrideId = firstText(defaults.legacyOverrideId);
        if (legacyOverrideId) byLegacyOverrideId.set(legacyOverrideId, meta);
        if (goalId && coreBlockId && variantId) byGoalBlockVariant.set(`${goalId}\u0000${coreBlockId}\u0000${variantId}`, meta);
    }

    return { byTemplateId, byLegacyOverrideId, byGoalBlockVariant, goalPathById, goalLabelById, allPresets };
}

function dateKeyOf(item: Item): string {
    return String((item as any)?.date || '').trim();
}

export function buildHeatmapViewModel(params: {
    items: Item[];
    module: ViewInstance;
    inputSettings: InputSettings;
    goals?: GoalDefinition[];
    goalSettings?: GoalSettings;
}): {
    themesByPath: Map<string, any>;
    themesToTrack: string[];
    dataByThemeAndDate: Map<string, Map<string, Item[]>>;
    goalGroups: HeatmapGoalGroup[];
} {
    const { items, module, inputSettings, goals = [], goalSettings } = params;

    const config = module.viewConfig || {};

    const themesByPath = buildThemesByPathMap(inputSettings.themes);

    // 当 viewConfig 未显式指定 themePaths 时：自动从当前 items 推断主题列表
    const inferredThemePaths: string[] = (() => {
        const set = new Set<string>();
        for (const it of items) {
            const themePath = getItemThemePath(it);
            if (themePath) {
                set.add(themePath);
            }
        }
        return Array.from(set);
    })();

    const themesToTrack = Array.isArray((config as any).themePaths) && (config as any).themePaths.length > 0
        ? (config as any).themePaths
        : inferredThemePaths;

    const dataByThemeAndDate = buildThemeDataMap(items, themesToTrack);

    const trackedThemeSet = new Set(themesToTrack || []);
    const filterByTheme = trackedThemeSet.size > 0;
    const goalMap = new Map<string, HeatmapGoalGroup>();
    const lookups = buildPresetLookups(goalSettings, goals);

    function ensureGoalGroup(goalPath: string, label: string): HeatmapGoalGroup {
        const normalizedGoalPath = goalPath || UNASSIGNED_GOAL_KEY;
        let goalGroup = goalMap.get(normalizedGoalPath);
        if (!goalGroup) {
            goalGroup = { goalPath: normalizedGoalPath, label: label || normalizedGoalPath, count: 0, entries: [] };
            goalMap.set(normalizedGoalPath, goalGroup);
        }
        return goalGroup;
    }

    function ensurePresetEntry(goalGroup: HeatmapGoalGroup, meta: { presetKey: string; themePath: string; label: string }): HeatmapGoalThemeEntry {
        let entry = goalGroup.entries.find((candidate) => candidate.presetKey === meta.presetKey);
        if (!entry) {
            entry = {
                presetKey: meta.presetKey,
                themePath: meta.themePath || '__default__',
                label: meta.label || themeLeaf(meta.themePath),
                count: 0,
                dataForTheme: new Map(),
            };
            goalGroup.entries.push(entry);
        }
        return entry;
    }

    // 目标迁移完成后，打卡视图的主结构应来自“目标 × 打卡预设”，
    // 而不是只从当前日期范围里已有记录反推。这样周视图/日视图即使某天没有记录，
    // 也会稳定显示：目标 → 多个打卡模板/预设 → 日期格。
    for (const preset of lookups.allPresets) {
        if (preset.coreBlockId !== 'core.habit') continue;
        const goalGroup = ensureGoalGroup(preset.goalPath, preset.goalLabel);
        ensurePresetEntry(goalGroup, {
            presetKey: preset.key,
            themePath: preset.themePath || '__default__',
            label: preset.label || themeLeaf(preset.themePath),
        });
    }

    function resolvePresetMeta(item: Item): PresetMeta | null {
        const templateId = itemTemplateId(item);
        if (templateId) {
            const direct = lookups.byTemplateId.get(templateId) || lookups.byLegacyOverrideId.get(templateId);
            if (direct) return direct;
        }

        const goalId = firstText((item as any).goalId) || readExtraText(item, '目标ID');
        const coreBlockId = itemCoreBlock(item);
        const variantId = itemTemplateVariantId(item) || 'default';
        if (goalId && coreBlockId) {
            return lookups.byGoalBlockVariant.get(`${goalId}\u0000${coreBlockId}\u0000${variantId}`)
                || lookups.byGoalBlockVariant.get(`${goalId}\u0000${coreBlockId}\u0000default`)
                || null;
        }
        return null;
    }

    for (const item of items || []) {
        const date = dateKeyOf(item);
        if (!date) continue;

        const preset = resolvePresetMeta(item);
        const themePath = preset?.themePath || getItemThemePath(item) || '__default__';
        // 旧配置里的 themePaths 只作为 legacy fallback 过滤条件。
        // 已经能识别到目标预设的记录不能再被旧主题列表挡掉，否则目标分组会缺行。
        if (!preset && filterByTheme && themePath !== '__default__' && !trackedThemeSet.has(themePath)) continue;

        const explicitGoalPath = getItemGoalKey(item, goals);
        const goalPath = explicitGoalPath !== UNASSIGNED_GOAL_KEY ? explicitGoalPath : (preset?.goalPath || UNASSIGNED_GOAL_KEY);
        const goalLabel = goalPath === preset?.goalPath ? preset.goalLabel : (getItemGoalLabel(item, goals) || preset?.goalLabel || goalPath);

        const goalGroup = ensureGoalGroup(goalPath, goalLabel);
        goalGroup.count += 1;

        const presetKey = preset?.key || `${goalPath}\u0000${themePath}\u0000${itemCoreBlock(item) || 'habit'}`;
        const label = preset?.label || themeLeaf(themePath);
        const entry = ensurePresetEntry(goalGroup, { presetKey, themePath, label });
        entry.count += 1;

        const dayItems = entry.dataForTheme.get(date) || [];
        entry.dataForTheme.set(date, [...dayItems, item]);
    }

    const goalGroups = Array.from(goalMap.values()).map((group) => ({
        ...group,
        entries: group.entries.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-CN')),
    })).sort((a, b) => {
        if (a.goalPath === UNASSIGNED_GOAL_KEY && b.goalPath !== UNASSIGNED_GOAL_KEY) return 1;
        if (a.goalPath !== UNASSIGNED_GOAL_KEY && b.goalPath === UNASSIGNED_GOAL_KEY) return -1;
        return b.count - a.count || a.label.localeCompare(b.label, 'zh-CN');
    });

    return { themesByPath, themesToTrack, dataByThemeAndDate, goalGroups };
}
