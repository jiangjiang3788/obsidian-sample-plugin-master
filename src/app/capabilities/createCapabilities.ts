// src/app/capabilities/createCapabilities.ts
import type { App } from 'obsidian';
import type { ThinkSettings } from '@core/public';
import { createAiCapability, type AiCapability } from './capabilities/ai';
import { createTimerCapability, type TimerCapability } from './capabilities/timer';

export interface Capabilities {
    ai: AiCapability;
    timer: TimerCapability;
}

/**
 * Composition root for capabilities.
 * - 这里可以 resolve/usecase/service（只能在 app/main 层）
 * - features/shared 不允许触达 container，也不允许拼装 service
 */
export function createCapabilities(app: App, settings: ThinkSettings): Capabilities {
    return {
        ai: createAiCapability(app, settings),
        timer: createTimerCapability(app, settings),
    };
}
