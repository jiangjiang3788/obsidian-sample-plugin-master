// src/app/store/mutations/generalSettingsMutations.ts
/** Pure settings mutations for the generic Settings slice. */

import type { AiSettings, InputSettings, ThinkSettings } from '@core/types/public';

export function setFloatingTimerEnabledDraft(draft: ThinkSettings, enabled: boolean): void {
    draft.floatingTimerEnabled = enabled;
}

export function patchInputSettingsDraft(draft: ThinkSettings, updates: Partial<InputSettings>): void {
    draft.inputSettings = { ...draft.inputSettings, ...updates };
}

export function replaceAiSettingsDraft(draft: ThinkSettings, aiSettings: AiSettings): void {
    draft.aiSettings = aiSettings;
}

export function patchSettingsDraft(draft: ThinkSettings, updates: Partial<ThinkSettings>): void {
    Object.assign(draft, updates);
}
