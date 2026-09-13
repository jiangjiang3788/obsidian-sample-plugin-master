// src/core/utils/heatmapTemplate.ts
// Heatmap fallback-template helpers in the Goal-only model.

import type { RecordCaptureTemplate, InputSettings } from '@/core/recordInput/CaptureTemplate';

export function getEffectiveHeatmapTemplate(
    settings: InputSettings,
    recordTypeId: string,
): RecordCaptureTemplate | null {
    return settings.recordTypes.find((block) => block.id === recordTypeId || block.recordTypeId === recordTypeId) ?? null;
}

export function buildRatingMapping(
    inputSettings: InputSettings,
    recordTypeId: string,
): Map<string, string> {
    const effectiveTemplate = getEffectiveHeatmapTemplate(inputSettings, recordTypeId);
    const ratingField = effectiveTemplate?.fields.find((field) => field.type === 'rating');
    return new Map<string, string>(
        ratingField?.options?.filter((option) => option.value).map((option) => [option.label || '', option.value as string]) || [],
    );
}

/** Rating mapping depends on Goal × Record Type, not Theme metadata. */
export class RatingMappingCache {
    private cache = new Map<string, Map<string, string>>();

    clear(): void {
        this.cache.clear();
    }

    get(inputSettings: InputSettings, recordTypeId: string, goalPath?: string): Map<string, string> {
        const cacheKey = `${recordTypeId}:${goalPath || 'default'}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;
        const mapping = buildRatingMapping(inputSettings, recordTypeId);
        this.cache.set(cacheKey, mapping);
        return mapping;
    }
}
