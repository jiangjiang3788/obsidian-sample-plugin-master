// src/core/services/TemplateResolver.ts
// Legacy block-template resolver - block default only

import type { InputSettings, BlockTemplate, ThemeDefinition } from '@/core/types/schema';

/**
 * 模板解析结果
 */
export interface TemplateResolveResult {
    template: BlockTemplate | null;
    theme: ThemeDefinition | null;
    templateId: string | null;
    templateSourceType: 'block' | null;
}

/**
 * TemplateResolver - 统一的模板解析器
 * 
 * 这是项目中唯一的模板解析实现，所有需要获取有效模板的地方
 * 都应该通过此类或其导出的便捷函数来完成。
 * 
 * Override 合并规则：
 * 1. 找 baseBlock（通过 blockId）
 * 2. 找 theme（通过 themeId 对应 ThemeDefinition，可能为 null）
 * 3. themeId 只用于解析主题 metadata；不再应用 Theme × Block override。
 * 4. 返回 baseBlock + theme。
 */
export class TemplateResolver {
    /**
     * 解析有效的模板配置
     * 
     * @param settings InputSettings 配置
     * @param blockId Block 模板 ID
     * @param themeId 可选的主题 ID
     * @returns 包含 template 和 theme 的对象
     */
    static resolve(
        settings: InputSettings,
        blockId: string,
        themeId?: string
    ): TemplateResolveResult {
        // Step 1: 查找 baseBlock
        const baseBlock = settings.blocks.find(b => b.id === blockId);
        if (!baseBlock) {
            return { template: null, theme: null, templateId: null, templateSourceType: null };
        }

        // Step 2: 查找 theme
        const theme = themeId 
            ? settings.themes.find(t => t.id === themeId) || null 
            : null;

        // MIGRATION CLOSEOUT:
        // Theme × Block overrides have been migrated into Goal × Block presets.
        // This legacy resolver no longer applies settings.overrides at runtime.
        // Theme remains visible as metadata only; template fields/output come from
        // the Block default here, or from GoalTemplateResolver in the main chain.
        return { template: baseBlock, theme, templateId: baseBlock.id, templateSourceType: 'block' };
    }

    /**
     * 便捷方法：仅返回模板，不返回主题
     * 
     * @param settings InputSettings 配置
     * @param blockId Block 模板 ID
     * @param themeId 可选的主题 ID
     * @returns BlockTemplate 或 null
     */
    static resolveTemplateOnly(
        settings: InputSettings,
        blockId: string,
        themeId?: string
    ): BlockTemplate | null {
        return TemplateResolver.resolve(settings, blockId, themeId).template;
    }
}

// 导出便捷函数，供直接使用
export const resolveTemplate = TemplateResolver.resolve;
export const resolveTemplateOnly = TemplateResolver.resolveTemplateOnly;
