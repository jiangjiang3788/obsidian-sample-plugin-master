// src/features/aiinput/registerFeature.ts
// ---------------------------------------------------------------------------
// Feature registration (AiInput)
// ---------------------------------------------------------------------------

import type ThinkPlugin from '@main';
import type { FeatureRegistry, UIFeatureBootContext } from '@capabilities';

import { setup } from './index';

export interface AiInputFeatureDeps {
    plugin: ThinkPlugin;
}

export function registerAiInputFeature(
    registry: FeatureRegistry<UIFeatureBootContext>,
    deps: AiInputFeatureDeps
): void {
    registry.register({
        id: 'aiinput',
        description: 'AI Input commands',
        bootMode: 'background',
        delayMs: 120,
        boot: () => {
            setup({ plugin: deps.plugin });
        },
    });
}
