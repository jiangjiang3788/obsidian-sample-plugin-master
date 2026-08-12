// src/app/features/registerFeatureContributions.ts
// ---------------------------------------------------------------------------
// Central feature registration list.
// ---------------------------------------------------------------------------
//
// Why have a single list?
// - Avoid "double system" where some features are booted by FeatureLoader methods
//   while others are registered elsewhere.
// - Adding a new feature should be:
//   1) create src/features/<feature>/registerFeature.ts
//   2) add ONE import + register call here

import type { PluginHost } from '@core/ports/public';
import type { ActionService, DataStore } from '@core/services/public';
import type { EventsPort } from '@core/ports/public';
import type { RendererService } from '@/app/dashboard/RendererService';

import { FeatureRegistry } from '../FeatureRegistry';
import type { UIFeatureBootContext } from './featureContext';

import { registerSettingsFeatures } from '@features/settings/registerFeature';
import { registerDashboardFeature } from '@/app/dashboard/registerDashboard';
import { registerQuickInputFeature } from '@features/quickinput/registerFeature';
import { registerAiInputFeature } from '@features/aiinput/registerFeature';

export interface UIFeatureDeps {
    plugin: PluginHost;
    eventsPort: EventsPort;
    dataStore: DataStore;
    rendererService: RendererService;
    actionService: ActionService;
}

export function registerFeatureContributions(
    registry: FeatureRegistry<UIFeatureBootContext>,
    deps: UIFeatureDeps
): void {
    registerDashboardFeature(registry, deps);
    registerSettingsFeatures(registry, { plugin: deps.plugin, dataStore: deps.dataStore });

    // Standalone command features
    registerQuickInputFeature(registry, { plugin: deps.plugin });
    registerAiInputFeature(registry, { plugin: deps.plugin });
}
