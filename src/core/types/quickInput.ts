// src/core/types/quickInput.ts
/** QuickInput stable save contract. Goal is carried only by form/context as one slash path. */
import type { RecordCaptureTemplate } from '@/core/recordInput/CaptureTemplate';
import type { RecordInputMeta, RecordInputSource } from './recordInput';

export interface QuickInputSaveData {
    blockId?: string;
    context?: Record<string, unknown>;
    formData: Record<string, unknown>;
    meta?: RecordInputMeta;
    source?: Extract<RecordInputSource, 'timer' | 'quickinput' | 'view_quick_create' | 'unknown'>;
    template?: RecordCaptureTemplate;
    templateId?: string | null;
    templateSourceType?: 'record-type' | 'goal-template' | null;
}
