// src/core/services/public.ts
/**
 * Core services public facade.
 *
 * This surface is intentionally limited to stable service classes, DI tokens,
 * and service contracts needed by app/platform composition code. Feature/UI
 * code should prefer narrower domain facades where possible.
 */
export { DataStore } from './DataStore';
export { InputService } from './InputService';
export { ItemService } from './item/ItemService';
export { ActionService } from './ActionService';
export { TimerStateService } from './TimerStateService';
export { SettingsRepository, SETTINGS_PERSISTENCE_TOKEN } from './SettingsRepository';
export type { ISettingsPersistence } from './SettingsRepository';
export { RepositorySettingsProvider } from './RepositorySettingsProvider';
export { VaultFileStorage, STORAGE_TOKEN } from './StorageService';
export type { IPluginStorage } from './StorageService';
export * from './types';
