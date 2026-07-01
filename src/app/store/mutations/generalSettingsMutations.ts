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

export function replaceActiveThemePathsDraft(draft: ThinkSettings, paths: string[]): void {
    draft.activeThemePaths = paths;
}

export function addActiveThemePathDraft(draft: ThinkSettings, path: string): void {
    if (!draft.activeThemePaths) draft.activeThemePaths = [];
    if (!draft.activeThemePaths.includes(path)) draft.activeThemePaths.push(path);
}

export function removeActiveThemePathDraft(draft: ThinkSettings, path: string): void {
    if (draft.activeThemePaths) {
        draft.activeThemePaths = draft.activeThemePaths.filter((candidate) => candidate !== path);
    }
}

export function patchSettingsDraft(draft: ThinkSettings, updates: Partial<ThinkSettings>): void {
    Object.assign(draft, updates);
}
