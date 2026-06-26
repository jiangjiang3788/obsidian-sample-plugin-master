// src/core/utils/inputTemplateUtils.ts
// 单人版收敛：输入模板工具只做 block 默认模板读取。
// 新建记录主链必须使用 GoalTemplateResolver；此文件仅给 AI/Heatmap 等辅助场景读取 block fallback。

import type { InputSettings, BlockTemplate, ThemeDefinition } from '@/core/types/schema';

export interface TemplateResolveResult {
    template: BlockTemplate | null;
    theme: ThemeDefinition | null;
    templateId: string | null;
    templateSourceType: 'legacy-block' | null;
}

export function getEffectiveTemplate(
    settings: InputSettings,
    blockId: string,
    themeId?: string
): TemplateResolveResult {
    const template = settings.blocks.find((block) => block.id === blockId) ?? null;
    const theme = themeId ? settings.themes.find((candidate) => candidate.id === themeId) ?? null : null;
    return {
        template,
        theme,
        templateId: template?.id ?? null,
        templateSourceType: template ? 'legacy-block' : null,
    };
}

export function getEffectiveTemplateOnly(
    settings: InputSettings,
    blockId: string,
    themeId?: string
): BlockTemplate | null {
    return getEffectiveTemplate(settings, blockId, themeId).template;
}
