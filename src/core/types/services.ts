// src/core/types/services.ts
/**
 * Services Contract (Tokens / Interfaces)
 * ---------------------------------------------------------------
 * 说明：这些符号来自 core/services/types.ts（DI tokens + 少量接口）。
 * 为了满足 “外部只能走 @core/public” 的约束，这里作为对外出口进行显式 re-export。
 */

export { AppToken, SETTINGS_TOKEN, SettingsProviderToken } from '../services/types';
export type { ISettingsProvider, QuickInputConfig } from '../services/types';
