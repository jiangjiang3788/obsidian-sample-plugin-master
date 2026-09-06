// src/core/bootstrap/public.ts
/**
 * Core bootstrap public facade for composition-root only dependencies.
 */
export { ensureReflectMetadata } from '../polyfills';
export { setupCoreContainer } from '../di/setupCore';
export { applyGoalTaskDefaultsSeed, GOAL_TASK_DEFAULTS_SEED_VERSION } from '../settings/goalTaskDefaultsSeed';
