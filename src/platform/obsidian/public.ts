// src/platform/obsidian/public.ts
/**
 * Obsidian platform public facade.
 *
 * The project currently targets Obsidian only, so all concrete platform
 * adapters live under this folder. Feature/app code should prefer this facade
 * when it needs an Obsidian adapter entrypoint instead of deep importing
 * arbitrary files under src/platform/obsidian/**.
 */
export { ObsidianAiHttpTransport } from './ObsidianAiHttpTransport';
export { ObsidianEventsPort } from './ObsidianEventsPort';
export { ObsidianFileStatPort } from './ObsidianFileStatPort';
export { ObsidianMessageRenderPort } from './ObsidianMessageRenderPort';
export { ObsidianMetadataPort } from './ObsidianMetadataPort';
export { ObsidianModalPort } from './ObsidianModalPort';
export { ObsidianUiPort } from './ObsidianUiPort';
export { ObsidianVaultPort } from './ObsidianVaultPort';
export { SettingsTab } from './SettingsTab';
export { SettingsRoot } from './SettingsRoot';
export { THINK_SETTINGS_VIEW_TYPE, openThinkSettingsWorkspaceView, registerThinkSettingsWorkspaceView } from './ThinkSettingsView';
export { VaultWatcher } from './events/VaultWatcher';
export { NamePromptModal } from './modals/NamePromptModal';

export { registerEnergyProtocolHandler } from './protocols/EnergyProtocolHandler';
