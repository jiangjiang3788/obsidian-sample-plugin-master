// src/core/ai/AiConfigSnapshot.ts
// AI 配置快照 - 把 inputSettings + aiSettings 转成模型可读的最小快照

import type { InputSettings } from '@/core/types/schema';
import type { AiSettings } from '@/core/types/ai-schema';
import { getEffectiveTemplate } from '@/core/utils/inputTemplateUtils';

/**
 * AI Block 配置字段
 */
export interface AiBlockConfigField {
    key: string;
    label: string;
    type: string;
    options?: Array<{ value: string; label: string }>;
    defaultValue?: any;
}

/**
 * AI Block 配置
 */
export interface AiBlockConfig {
    id: string;
    name: string;
    fields: AiBlockConfigField[];
}

/**
 * AI 主题配置
 */
export interface AiThemeConfig {
    id: string;
    path: string;
    /** 主题名称（path 的最后一部分） */
    name: string;
}

/**
 * AI 配置快照
 * 只保留给模型看的最小子集，避免 prompt 过大
 */
export interface AiConfigSnapshot {
    blocks: AiBlockConfig[];
    themes: AiThemeConfig[];
}

/**
 * 构建 AI 配置快照
 * 
 * @param input InputSettings 配置
 * @param ai AiSettings 配置
 * @returns AI 配置快照
 */
export function buildAiConfigSnapshot(input: InputSettings, ai: AiSettings): AiConfigSnapshot {
    // 如果指定了 enabledBlockIds，则只保留这些 block
    const enabledSet = ai.enabledBlockIds?.length ? new Set(ai.enabledBlockIds) : null;

    const blocks = input.blocks
        .filter(b => !enabledSet || enabledSet.has(b.id))
        .map(b => {
            // 用 getEffectiveTemplate 来获取字段（最贴合实际 override）
            const effective = getEffectiveTemplate(input, b.id, undefined);
            const sourceFields = effective?.template?.fields ?? b.fields ?? [];
            
            const fields: AiBlockConfigField[] = sourceFields.map(f => ({
                key: f.key,
                label: f.label,
                type: f.type,
                options: (f.options ?? []).map(o => ({
                    value: o.value,
                    label: o.label || o.value,
                })),
                defaultValue: f.defaultValue,
            }));

            return {
                id: b.id,
                name: b.name,
                fields,
            };
        });

    const themes = input.themes.map(t => ({
        id: t.id,
        path: t.path,
        name: t.path.split('/').pop() || t.path,
    }));

    return { blocks, themes };
}
