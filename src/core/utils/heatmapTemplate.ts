import type { BlockTemplate, InputSettings, ThemeDefinition } from '@/core/types/schema';

/**
 * 获取有效的模板配置
 */
export function getEffectiveTemplate(
    settings: InputSettings, 
    blockId: string, 
    themeId?: string
): BlockTemplate | null {
    const baseBlock = settings.blocks.find(b => b.id === blockId);
    if (!baseBlock) return null;
    
    if (themeId) {
        const override = settings.overrides.find(o => o.blockId === blockId && o.themeId === themeId);
        // ThemeOverride使用disabled字段，不是status
        if (override && !override.disabled) {
            return { 
                ...baseBlock, 
                fields: override.fields ?? baseBlock.fields, 
                outputTemplate: override.outputTemplate ?? baseBlock.outputTemplate, 
                targetFile: override.targetFile ?? baseBlock.targetFile, 
                appendUnderHeader: override.appendUnderHeader ?? baseBlock.appendUnderHeader 
            };
        }
    }
    return baseBlock;
}

/**
 * 构建评分映射
 */
export function buildRatingMapping(
    inputSettings: InputSettings, 
    blockId: string, 
    themeId?: string
): Map<string, string> {
    const effectiveTemplate = getEffectiveTemplate(inputSettings, blockId, themeId);
    const ratingField = effectiveTemplate?.fields.find(f => f.type === 'rating');
    
    return new Map<string, string>(
        ratingField?.options?.filter(opt => opt.value).map(opt => [opt.label || '', opt.value as string]) || []
    );
}

/**
 * 评分映射缓存管理器
 */
export class RatingMappingCache {
    private cache = new Map<string, Map<string, string>>();
    
    clear(): void {
        this.cache.clear();
    }
    
    get(
        inputSettings: InputSettings,
        blockId: string,
        themePath?: string,
        themesByPath?: Map<string, ThemeDefinition>
    ): Map<string, string> {
        const themeId = themePath && themePath !== '__default__' && themesByPath 
            ? themesByPath.get(themePath)?.id 
            : undefined;
        const cacheKey = `${blockId}:${themePath || 'default'}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }
        
        const mapping = buildRatingMapping(inputSettings, blockId, themeId);
        this.cache.set(cacheKey, mapping);
        return mapping;
    }
}
