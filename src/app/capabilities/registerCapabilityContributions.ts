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
import type { CapabilityDeps } from './types';
import { createTimerCapability } from './capabilities/timer';
import type { CapabilityRegistry } from './CapabilityRegistry';
import type { CapabilityMap } from './types';

export function registerCapabilityContributions(registry: CapabilityRegistry<CapabilityMap>): void {
    registry.register('ai', (_app, _settings, deps: CapabilityDeps) => createAiCapability(deps));
    registry.register('timer', (_app, _settings, deps: CapabilityDeps) => createTimerCapability(deps));
}
