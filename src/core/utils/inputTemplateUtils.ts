// src/core/utils/inputTemplateUtils.ts
// Single-user Goal-only capture helpers: resolve only CoreBlock fallback templates.

import type { InputSettings, RecordCaptureTemplate } from '@/core/recordInput/CaptureTemplate';
import { DEFAULT_CORE_BLOCKS } from '@/core/blocks';

export interface TemplateResolveResult {
    template: RecordCaptureTemplate | null;
    templateId: string | null;
    templateSourceType: 'core-block' | null;
}

export function getEffectiveTemplate(
    settings: InputSettings,
    blockId: string,
): TemplateResolveResult {
    const configured = settings.blocks || [];
    const templates = [
        ...configured,
        ...DEFAULT_CORE_BLOCKS.filter((block) => !configured.some((existing) => existing.id === block.id)),
    ];
    const template = templates.find((block) => block.id === blockId || block.coreBlockId === blockId) ?? null;
    return {
        template,
        templateId: template?.id ?? null,
        templateSourceType: template ? 'core-block' : null,
    };
}

export function getEffectiveTemplateOnly(
    settings: InputSettings,
    blockId: string,
): RecordCaptureTemplate | null {
    return getEffectiveTemplate(settings, blockId).template;
}
