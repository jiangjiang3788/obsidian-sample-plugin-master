// src/app/capabilities/types.ts
// ---------------------------------------------------------------------------
// Capabilities public shape (types only)
// ---------------------------------------------------------------------------
//
// Why a separate file?
// - Avoid circular imports when we split "registration" vs "composition".
// - Keep createCapabilities.ts lean.

import type { AiCapability } from './capabilities/ai';
import type { TimerCapability } from './capabilities/timer';

export interface Capabilities {
    ai: AiCapability;
    timer: TimerCapability;
}

export type CapabilityMap = Capabilities;
