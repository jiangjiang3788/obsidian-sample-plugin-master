import type { ZustandAppStore } from '@/app/store/useAppStore';

export const selectSettings = (s: ZustandAppStore) => s.settings;

export const selectInputSettings = (s: ZustandAppStore) => s.settings.inputSettings;

export const selectAiSettings = (s: ZustandAppStore) => s.settings.aiSettings;

export const selectLayouts = (s: ZustandAppStore) => s.settings.layouts;

export const selectViewInstances = (s: ZustandAppStore) => s.settings.viewInstances;

export const makeSelectLayoutById = (layoutId: string) => (s: ZustandAppStore) =>
  s.settings.layouts?.find((l) => l.id === layoutId);

export const makeSelectViewInstanceById = (instanceId: string) => (s: ZustandAppStore) =>
  s.settings.viewInstances?.find((v) => v.id === instanceId);
