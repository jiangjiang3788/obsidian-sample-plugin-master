// src/features/quickinput/registerFeature.ts
// ---------------------------------------------------------------------------
// Feature registration (QuickInput)
// ---------------------------------------------------------------------------

import type { PluginHost } from '@core/ports/public';
import type { FeatureRegistry, UIFeatureBootContext } from '@capabilities';

import { setup } from './index';

export interface QuickInputFeatureDeps {
    plugin: PluginHost;
}

export function registerQuickInputFeature(
    registry: FeatureRegistry<UIFeatureBootContext>,
    deps: QuickInputFeatureDeps
): void {
    registry.register({
        id: 'quickinput',
        description: 'QuickInput commands',
        bootMode: 'background',
        delayMs: 100,
        boot: () => {
            setup({ plugin: deps.plugin });
        },
    });
}
