import type { PluginHost } from '@core/ports/public';
import type { ActionService, DataStore } from '@core/services/public';
import type { EventsPort } from '@core/ports/public';
import { VaultWatcher } from '@/platform/obsidian/public';
import type { FeatureRegistry } from '@/app/FeatureRegistry';
import type { UIFeatureBootContext } from '@/app/features/featureContext';
import type { RendererService } from './RendererService';
import { CodeblockEmbedder } from './CodeblockEmbedder';

export interface DashboardFeatureDeps {
  plugin: PluginHost;
  eventsPort: EventsPort;
  dataStore: DataStore;
  rendererService: RendererService;
  actionService: ActionService;
}

export function registerDashboardFeature(
  registry: FeatureRegistry<UIFeatureBootContext>,
  deps: DashboardFeatureDeps
): void {
  registry.register({
    id: 'dashboard',
    description: 'Dashboard (VaultWatcher + CodeblockEmbedder)',
    bootMode: 'blocking',
    boot: async (ctx) => {
      if (ctx?.dataScanPromise) await ctx.dataScanPromise;
      const watcher = new VaultWatcher(deps.eventsPort, deps.dataStore);
      new CodeblockEmbedder(deps.plugin, deps.dataStore, deps.rendererService, deps.actionService);
      return () => {
        try { watcher.dispose(); } catch {}
      };
    },
  });
}
