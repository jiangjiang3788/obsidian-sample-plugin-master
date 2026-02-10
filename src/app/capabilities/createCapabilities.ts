// src/app/capabilities/createCapabilities.ts
import type { ThinkSettings } from '@core/public';
import { CapabilityRegistry } from './CapabilityRegistry';
import type { Capabilities, CapabilityMap, CapabilityDeps } from './types';
import { registerCapabilityContributions } from './registerCapabilityContributions';

export type { Capabilities, CapabilityMap } from './types';

/**
 * Phase1: Capabilities 变“可注入体系”的第一步
 * - 默认把内建能力注册进 registry
 * - 后续 features 可以在 createCapabilities(...) 之前追加 registry.register(...)
 */
export function createDefaultCapabilityRegistry(): CapabilityRegistry<CapabilityMap> {
    const registry = new CapabilityRegistry<CapabilityMap>();
    registerCapabilityContributions(registry);
    return registry;
}

/**
 * Composition root for capabilities.
 * - 这里可以 resolve/usecase/service（只能在 app/main 层）
 * - features/shared 不允许触达 container，也不允许拼装 service
 */
export function createCapabilities(
    app: unknown,
    settings: ThinkSettings,
    deps: CapabilityDeps,
    registry: CapabilityRegistry<CapabilityMap> = createDefaultCapabilityRegistry()
): Capabilities {
    return registry.createAll(app, settings, deps);
}
