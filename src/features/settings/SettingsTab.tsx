// src/features/settings/SettingsTab.tsx
//
// Moved to platform layer to enforce: only src/platform/** can import 'obsidian'.
// This file remains as a thin re-export to keep existing imports stable.

export { SettingsTab, SettingsRoot } from '@/platform/SettingsTab';
export { registerThinkSettingsWorkspaceView, openThinkSettingsWorkspaceView, THINK_SETTINGS_VIEW_TYPE } from '@/platform/ThinkSettingsView';
