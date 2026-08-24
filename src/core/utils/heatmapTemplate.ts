// src/core/utils/heatmapTemplate.ts
// Heatmap fallback-template helpers in the Goal-only model.

import type { RecordCaptureTemplate, InputSettings } from '@/core/recordInput/CaptureTemplate';

export function getEffectiveHeatmapTemplate(
    settings: InputSettings,
    blockId: string,
): RecordCaptureTemplate | null {
    return settings.blocks.find((block) => block.id === blockId || block.recordTypeId === blockId) ?? null;
}

export function buildRatingMapping(
    inputSettings: InputSettings,
    blockId: string,
): Map<string, string> {
    const effectiveTemplate = getEffectiveHeatmapTemplate(inputSettings, blockId);
    const ratingField = effectiveTemplate?.fields.find((field) => field.type === 'rating');
    return new Map<string, string>(
        ratingField?.options?.filter((option) => option.value).map((option) => [option.label || '', option.value as string]) || [],
    );
}

/** Rating mapping depends on Goal × Block, not Theme metadata. */
export class RatingMappingCache {
    private cache = new Map<string, Map<string, string>>();

    clear(): void {
        this.cache.clear();
    }

    get(inputSettings: InputSettings, blockId: string, goalPath?: string): Map<string, string> {
        const cacheKey = `${blockId}:${goalPath || 'default'}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;
        const mapping = buildRatingMapping(inputSettings, blockId);
        this.cache.set(cacheKey, mapping);
        return mapping;
    }
}
