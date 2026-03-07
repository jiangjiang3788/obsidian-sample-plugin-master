// src/core/services/TemplateResolver.ts
// 统一的模板解析器 - 单一真源实现

import type { InputSettings, BlockTemplate, ThemeDefinition, ThemeOverride } from '@/core/types/schema';

/**
 * 模板解析结果
 */
export interface TemplateResolveResult {
    template: BlockTemplate | null;
    theme: ThemeDefinition | null;
    templateId: string | null;
    templateSourceType: 'block' | 'override' | null;
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
 * 3. 如果 themeId 存在：
 *    - 找 override（blockId + themeId 组合）
 *    - override.disabled 为 true 时：不应用 override，返回 baseBlock + theme
 *    - override.disabled 为 false 时：合并 fields/outputTemplate/targetFile/appendUnderHeader
 *      （override 优先，fallback baseBlock）
 * 4. themeId 不存在时：返回 baseBlock + null theme
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

        // Step 3: 如果有 themeId，尝试查找并应用 override
        if (themeId) {
            const override = settings.overrides.find(
                o => o.blockId === blockId && o.themeId === themeId
            );
            
            // 只有当 override 存在且未被禁用时才应用合并
            if (override && !override.disabled) {
                const effectiveTemplate: BlockTemplate = {
                    ...baseBlock,
                    // override 字段优先，fallback 到 baseBlock
                    fields: override.fields ?? baseBlock.fields,
                    outputTemplate: override.outputTemplate ?? baseBlock.outputTemplate,
                    targetFile: override.targetFile ?? baseBlock.targetFile,
                    appendUnderHeader: override.appendUnderHeader ?? baseBlock.appendUnderHeader,
                };
                return { template: effectiveTemplate, theme, templateId: override.id, templateSourceType: 'override' };
            }
        }

        // Step 4: 没有 themeId 或 override 被禁用/不存在，返回 baseBlock
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
