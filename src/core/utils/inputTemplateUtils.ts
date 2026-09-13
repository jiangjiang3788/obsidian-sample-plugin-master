// src/core/utils/inputTemplateUtils.ts
// Single-user Goal-only capture helpers: resolve only RecordType fallback templates.

import type { InputSettings, RecordCaptureTemplate } from '@/core/recordInput/CaptureTemplate';
import { DEFAULT_TEMPLATE_RECORD_TYPES } from '@/core/recordTypes/public';

export interface TemplateResolveResult {
    template: RecordCaptureTemplate | null;
    templateId: string | null;
    templateSourceType: 'record-type' | null;
}

export function getEffectiveTemplate(
    settings: InputSettings,
    recordTypeId: string,
): TemplateResolveResult {
    const configured = settings.recordTypes || [];
    const templates = [
        ...configured,
        ...DEFAULT_TEMPLATE_RECORD_TYPES.filter((block) => !configured.some((existing) => existing.id === block.id)),
    ];
    const template = templates.find((block) => block.id === recordTypeId || block.recordTypeId === recordTypeId) ?? null;
    return {
        template,
        templateId: template?.id ?? null,
        templateSourceType: template ? 'record-type' : null,
    };
}

export function getEffectiveTemplateOnly(
    settings: InputSettings,
    recordTypeId: string,
): RecordCaptureTemplate | null {
    return getEffectiveTemplate(settings, recordTypeId).template;
}
