// src/core/utils/inputTemplateUtils.ts
// 输入模板相关工具函数

import type { InputSettings, BlockTemplate, ThemeDefinition, ThemeOverride } from '@/core/types/schema';

/**
 * 获取有效的模板配置
 * 根据 blockId 和可选的 themeId，返回合并了 override 的最终模板
 * 
 * @param settings InputSettings 配置
 * @param blockId Block 模板 ID
 * @param themeId 可选的主题 ID
 * @returns 包含 template 和 theme 的对象
 */
export function getEffectiveTemplate(
    settings: InputSettings,
    blockId: string,
    themeId?: string
): { template: BlockTemplate | null; theme: ThemeDefinition | null } {
    const baseBlock = settings.blocks.find(b => b.id === blockId);
    if (!baseBlock) {
        return { template: null, theme: null };
    }

    const theme = settings.themes.find(t => t.id === themeId) || null;

    if (themeId) {
        const override = settings.overrides.find(
            o => o.blockId === blockId && o.themeId === themeId
        );
        
        if (override && !override.disabled) {
            const effectiveTemplate: BlockTemplate = {
                ...baseBlock,
                fields: override.fields ?? baseBlock.fields,
                outputTemplate: override.outputTemplate ?? baseBlock.outputTemplate,
                targetFile: override.targetFile ?? baseBlock.targetFile,
                appendUnderHeader: override.appendUnderHeader ?? baseBlock.appendUnderHeader,
            };
            return { template: effectiveTemplate, theme };
        }
    }

    return { template: baseBlock, theme };
}

/**
 * 获取指定 Block 可用的主题列表
 * 排除被 override 禁用的主题
 * 
 * @param settings InputSettings 配置
 * @param blockId Block 模板 ID
 * @returns 可用的主题定义列表
 */
export function getAvailableThemesForBlock(
    settings: InputSettings,
    blockId: string
): ThemeDefinition[] {
    const { themes, overrides } = settings;
    
    // 收集被禁用的主题 ID
    const disabledThemeIds = new Set<string>();
    overrides.forEach(override => {
        if (override.blockId === blockId && override.disabled) {
            disabledThemeIds.add(override.themeId);
        }
    });

    // 过滤出可用的主题
    return themes.filter(theme => !disabledThemeIds.has(theme.id));
}

/**
 * 检查指定的 block + theme 组合是否被禁用
 * 
 * @param settings InputSettings 配置
 * @param blockId Block 模板 ID
 * @param themeId 主题 ID
 * @returns 是否被禁用
 */
export function isThemeDisabledForBlock(
    settings: InputSettings,
    blockId: string,
    themeId: string
): boolean {
    const override = settings.overrides.find(
        o => o.blockId === blockId && o.themeId === themeId
    );
    return override?.disabled === true;
}

/**
 * 获取指定 block + theme 的 override 配置
 * 
 * @param settings InputSettings 配置
 * @param blockId Block 模板 ID
 * @param themeId 主题 ID
 * @returns Override 配置或 undefined
 */
export function getOverride(
    settings: InputSettings,
    blockId: string,
    themeId: string
): ThemeOverride | undefined {
    return settings.overrides.find(
        o => o.blockId === blockId && o.themeId === themeId
    );
}
