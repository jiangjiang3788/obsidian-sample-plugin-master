// src/core/utils/public.ts
/**
 * Core utility public facade.
 *
 * Narrow import surface for stable pure helpers, date helpers, aggregation,
 * filtering, logging, and record-submit presentation utilities that used to be
 * reachable only through the root `@core/public` compatibility facade.
 */
export * from './index';
export * from '../recordInput/recovery';
