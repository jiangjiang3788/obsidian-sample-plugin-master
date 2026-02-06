// src/app/features/featureContext.ts
// ---------------------------------------------------------------------------
// Shared context passed to FeatureRegistry.bootAll(...)
// ---------------------------------------------------------------------------
// Keep this file types-only to avoid runtime cycles.

export interface UIFeatureBootContext {
    /**
     * Promise of the initial data scan.
     * - Dashboard must wait for it.
     * - Other UI features can ignore.
     */
    dataScanPromise: Promise<void> | null;
}
