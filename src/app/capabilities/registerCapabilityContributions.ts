// src/app/capabilities/registerCapabilityContributions.ts
// ---------------------------------------------------------------------------
// Central place to register all capability factories.
// ---------------------------------------------------------------------------
//
// Goal: avoid "dual systems" where capability registration logic is scattered
// across main.ts / createCapabilities.ts / random feature files.
//
// Migration strategy:
// - Start with built-in capabilities here (ai/timer).
// - Later: let each feature contribute capabilities via a dedicated
//   app-side aggregator (still calling into THIS file), not by direct
//   registry.register(...) from many places.

import { createAiCapability } from './capabilities/ai';
import { createTimerCapability } from './capabilities/timer';
import type { CapabilityRegistry } from './CapabilityRegistry';
import type { CapabilityMap } from './types';

export function registerCapabilityContributions(registry: CapabilityRegistry<CapabilityMap>): void {
    registry.register('ai', (app, settings) => createAiCapability(app, settings));
    registry.register('timer', (app, settings) => createTimerCapability(app, settings));
}
