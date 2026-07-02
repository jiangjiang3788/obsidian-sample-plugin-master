// src/core/ai/AiConfigSnapshot.ts
// AI 配置快照 - 把 settings + aiSettings 转成模型可读的最小快照

import type { InputSettings, TemplateField } from '@/core/types/schema';
import type { AiSettings } from '@/core/types/ai-schema';
import type { GoalSettings } from '@/core/goal';
import { getGoalTemplates, isSystemRecordContextField } from '@/core/goal';
import { getEffectiveTemplate } from '@/core/utils/inputTemplateUtils';

/**
 * AI Block 配置字段
 */
export interface AiBlockConfigField {
    key: string;
    label: string;
    type: string;
    options?: Array<{ value: string; label: string }>;
    defaultValue?: unknown;
}

/**
 * AI Block 配置
 */
export interface AiBlockConfig {
    id: string;
    name: string;
    categoryKey: string;
    fields: AiBlockConfigField[];
}

/**
 * AI 主题配置。主题不再决定模板，只用于表单默认值、图标和统计维度。
 */
export interface AiThemeConfig {
    id: string;
    path: string;
    /** 主题名称（path 的最后一部分） */
    name: string;
}

/**
 * AI 目标配置。
 */
export interface AiGoalConfig {
    id: string;
    path: string;
    title: string;
    /** 目标默认主题。主题只是上下文字段，不决定模板。 */
    themePath?: string | null;
}

/**
 * AI 目标预设配置：目标 × Block 下的表单预设。
 */
export interface AiGoalPresetConfig {
    /** GoalTemplate id，提交时可作为稳定预设标识。 */
    id: string;
    goalId: string;
    goalPath: string;
    blockId: string;
    categoryKey: string;
    variantId: string;
    /** 与 id 同义，给 prompt 显示为目标预设 ID。 */
    goalTemplateId: string;
    name: string;
    themePath?: string;
    periodPolicy?: { enabled: boolean; granularity: 'week' | 'month' | 'quarter' | 'year' };
    fields: AiBlockConfigField[];
}

/**
 * AI 配置快照
 * 只保留给模型看的最小子集，避免 prompt 过大。
 */
export interface AiConfigSnapshot {
    blocks: AiBlockConfig[];
    themes: AiThemeConfig[];
    goals: AiGoalConfig[];
    goalPresets: AiGoalPresetConfig[];
}

function leaf(path?: string | null): string {
    const text = String(path || '').trim();
    if (!text) return '';
    return text.split('/').filter(Boolean).pop() || text;
}

function isAiVisibleField(field: TemplateField): boolean {
    return !isSystemRecordContextField(field?.key, field?.label, field?.semantic || field?.semanticType);
}

function normalizeField(field: TemplateField): AiBlockConfigField {
    return {
        key: field.key,
        label: field.label,
        type: field.type,
        options: (field.options ?? []).map((o) => ({
            value: o.value,
            label: o.label || o.value,
        })),
        defaultValue: field.defaultValue,
    };
}

function readThemePath(value: unknown): string | undefined {
    if (!value) return undefined;
    if (typeof value === 'string') return value.trim() || undefined;
    if (typeof value === 'object' && value && 'value' in value) {
        const option = value as { value?: unknown };
        return String(option.value || '').trim() || undefined;
    }
    return undefined;
}

/**
 * 构建 AI 配置快照
 *
 * @param input InputSettings 配置
 * @param ai AiSettings 配置
 * @param goalSettings 目标中心配置
 * @returns AI 配置快照
 */
export function buildAiConfigSnapshot(input: InputSettings | undefined, ai: AiSettings, goalSettings?: GoalSettings): AiConfigSnapshot {
    // 如果指定了 enabledBlockIds，则只保留这些 block。
    // 若 data 里仍是旧 blk_* ID，且已经无法匹配任何 CoreBlock，则忽略该过滤，避免 AI 快照为空。
    const rawEnabledSet = ai.enabledBlockIds?.length ? new Set(ai.enabledBlockIds) : null;
    const inputBlocks = input?.blocks ?? [];
    const hasEnabledBlockMatch = !!rawEnabledSet && inputBlocks.some((b) => rawEnabledSet.has(b.id) || rawEnabledSet.has(b.coreBlockId || ''));
    const enabledSet = hasEnabledBlockMatch ? rawEnabledSet : null;

    const blocks = inputBlocks
        .filter(b => !enabledSet || enabledSet.has(b.id) || enabledSet.has(b.coreBlockId || ''))
        .map(b => {
            // 新主链不再用 theme-template legacy 决定模板；这里仍使用 block 默认字段作为 AI 兜底字段。
            const effective = input ? getEffectiveTemplate(input, b.id, undefined) : undefined;
            const sourceFields = effective?.template?.fields ?? b.fields ?? [];

            const fields: AiBlockConfigField[] = sourceFields.filter(isAiVisibleField).map(normalizeField);

            return {
                id: b.id,
                name: b.name,
                categoryKey: b.categoryKey,
                fields,
            };
        });

    const blockById = new Map(inputBlocks.map((block) => [block.id, block]));
    const blockByCoreId = new Map(inputBlocks.map((block) => [block.coreBlockId || block.id, block]));

    const themes = (input?.themes ?? []).map(t => ({
        id: t.id,
        path: t.path,
        name: leaf(t.path),
    }));

    const goals = (goalSettings?.goals ?? [])
        .filter((goal) => goal.status !== 'archived')
        .map((goal) => ({
            id: goal.id,
            path: goal.goalPath || goal.title,
            title: goal.title || leaf(goal.goalPath),
            themePath: goal.themePath || null,
        }));
    const goalPathById = new Map(goals.map((goal) => [goal.id, goal.path]));

    const goalPresets = getGoalTemplates(goalSettings)
        .filter((preset) => preset.enabled !== false)
        .filter((preset) => !enabledSet || enabledSet.has(preset.coreBlockId))
        .map((preset) => {
            const block = blockByCoreId.get(preset.coreBlockId) || blockById.get(preset.coreBlockId);
            const fields = (preset.fields?.length ? preset.fields : block?.fields || []).filter(isAiVisibleField).map(normalizeField);
            const defaultThemePath = readThemePath(preset.defaultValues?.themePath)
                || readThemePath(preset.defaultValues?.['主题'])
                || fields.map((field) => readThemePath(field.defaultValue)).find(Boolean);
            return {
                id: preset.id,
                goalId: preset.goalId,
                goalPath: goalPathById.get(preset.goalId) || preset.goalId,
                blockId: preset.coreBlockId,
                categoryKey: block?.categoryKey || preset.coreBlockId,
                variantId: preset.variantId || 'default',
                goalTemplateId: preset.id,
                name: preset.name || preset.variantId || '默认预设',
                themePath: defaultThemePath,
                periodPolicy: preset.periodPolicy,
                fields,
            };
        });

    return { blocks, themes, goals, goalPresets };
}
