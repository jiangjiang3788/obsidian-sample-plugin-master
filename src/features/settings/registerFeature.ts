import type { PluginHost } from '@core/ports/public';
import type { DataStore } from '@core/services/public';
import type { FeatureRegistry, UIFeatureBootContext } from '@capabilities';
import { setupSettings } from './index';

export interface SettingsFeatureDeps {
  plugin: PluginHost;
  dataStore: DataStore;
}

export function registerSettingsFeatures(
  registry: FeatureRegistry<UIFeatureBootContext>,
  deps: SettingsFeatureDeps
): void {
  registry.register({
    id: 'settings',
    description: 'SettingsTab + open-settings command',
    bootMode: 'background',
    delayMs: 150,
    boot: () => {
      setupSettings({ app: deps.plugin.app, plugin: deps.plugin, dataStore: deps.dataStore });
      deps.plugin.addCommand({
        id: 'think-open-settings',
        name: '打开 Think 插件设置',
        callback: () => {
          (deps.plugin.app as any).setting?.open?.();
          (deps.plugin.app as any).setting?.openTabById?.(deps.plugin.manifest.id);
        },
      });
    },
  });
}
