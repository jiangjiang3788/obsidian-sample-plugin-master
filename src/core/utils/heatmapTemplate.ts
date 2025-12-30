// src/core/utils/heatmapTemplate.ts
// Heatmap 模板相关工具函数
//
// 注意：模板解析逻辑已统一到 TemplateResolver 中
// 此文件保留兼容 API，内部调用 TemplateResolver

import type { BlockTemplate, InputSettings, ThemeDefinition } from '@/core/types/schema';
import { TemplateResolver } from '@/core/services/TemplateResolver';

/**
 * 获取有效的模板配置
 * 
 * 此函数是对 TemplateResolver.resolveTemplateOnly 的兼容包装
 * 保持原有返回类型 BlockTemplate | null
 * 
 * @param settings InputSettings 配置
 * @param blockId Block 模板 ID
 * @param themeId 可选的主题 ID
 * @returns BlockTemplate 或 null
 */
export function getEffectiveTemplate(
    settings: InputSettings, 
    blockId: string, 
    themeId?: string
): BlockTemplate | null {
    return TemplateResolver.resolveTemplateOnly(settings, blockId, themeId);
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
