/**
 * Compatibility facade for the unified error handler.
 *
 * V27 moves types, custom errors, classification, user messaging and logging
 * into `shared/utils/error/*` while keeping this historical import path stable.
 */

export * from './error';
