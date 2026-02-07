// src/app/diagnostics/diDiagnostics.ts
// Dev-only diagnostics for DI / container wiring.
// Default: OFF to keep startup logs clean. Enable in dev console:
//   globalThis.__THINK_DI_DEBUG__ = true

import { devLog, devWarn } from '@core/public';

function isDevBuild(): boolean {
    // Vite provides import.meta.env in build; fallback for tests/Node.
    try {
        const env = (import.meta as any)?.env;
        if (typeof env?.DEV === 'boolean') return env.DEV;
    } catch {
        // ignore
    }

    return typeof process !== 'undefined'
        ? process.env.NODE_ENV !== 'production'
        : true;
}

export function isDiDebugEnabled(): boolean {
    return !!(isDevBuild() && (globalThis as any).__THINK_DI_DEBUG__);
}

export function diDebug(...args: any[]): void {
    if (!isDiDebugEnabled()) return;
    devLog('[DI]', ...args);
}

export function diWarn(...args: any[]): void {
    if (!isDiDebugEnabled()) return;
    devWarn('[DI]', ...args);
}
