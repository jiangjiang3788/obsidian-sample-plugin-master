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

import type ThinkPlugin from '@main';
import type { ActionService, DataStore } from '@core/public';
import type { EventsPort } from '@core/public';
import type { RendererService } from '@features/settings/RendererService';

import { FeatureRegistry } from '../FeatureRegistry';
import type { UIFeatureBootContext } from './featureContext';

import { registerSettingsFeatures } from '@features/settings/registerFeature';
import { registerQuickInputFeature } from '@features/quickinput/registerFeature';
import { registerAiInputFeature } from '@features/aiinput/registerFeature';

export interface UIFeatureDeps {
    plugin: ThinkPlugin;
    eventsPort: EventsPort;
    dataStore: DataStore;
    rendererService: RendererService;
    actionService: ActionService;
}

export function registerFeatureContributions(
    registry: FeatureRegistry<UIFeatureBootContext>,
    deps: UIFeatureDeps
): void {
    // Settings package contributes: dashboard + settings
    registerSettingsFeatures(registry, deps);

    // Standalone command features
    registerQuickInputFeature(registry, { plugin: deps.plugin });
    registerAiInputFeature(registry, { plugin: deps.plugin });
}
