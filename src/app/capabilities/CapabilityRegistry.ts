// src/app/capabilities/CapabilityRegistry.ts
import type { App } from 'obsidian';
import type { ThinkSettings } from '@core/public';

/**
 * Capability factory signature.
 *
 * Why keep it so small?
 * - capabilities 是 app 层的组合结果（composition root）
 * - factory 只拿 app + settings，避免把 DI 容器当成“万能依赖”继续扩散
 */
export type CapabilityFactory<T> = (app: App, settings: ThinkSettings) => T;

export interface CapabilityRegistryOptions {
    /**
     * When strict=true, re-registering the same key throws.
     * Useful to avoid silent override when multiple features try to claim the same capability id.
     */
    strict?: boolean;
}

/**
 * Registry for composing capabilities.
 *
 * - Used at startup (composition root)
 * - Allows Phase1 "feature injection" without hardcoding every capability in createCapabilities()
 */
export class CapabilityRegistry<CapMap extends Record<string, any> = Record<string, any>> {
    private readonly factories = new Map<keyof CapMap & string, CapabilityFactory<any>>();
    private readonly strict: boolean;

    constructor(options?: CapabilityRegistryOptions) {
        this.strict = options?.strict ?? true;
    }

    register<K extends keyof CapMap & string>(key: K, factory: CapabilityFactory<CapMap[K]>): void {
        if (this.strict && this.factories.has(key)) {
            throw new Error(`[CapabilityRegistry] capability '${key}' already registered`);
        }
        this.factories.set(key, factory as CapabilityFactory<any>);
    }

    has<K extends keyof CapMap & string>(key: K): boolean {
        return this.factories.has(key);
    }

    keys(): (keyof CapMap & string)[] {
        return [...this.factories.keys()] as (keyof CapMap & string)[];
    }

    createAll(app: App, settings: ThinkSettings): CapMap {
        const out: Record<string, unknown> = {};
        for (const [key, factory] of this.factories.entries()) {
            out[String(key)] = factory(app, settings);
        }
        return out as CapMap;
    }
}
