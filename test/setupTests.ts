// Jest setup (kept intentionally minimal)
// tsyringe requires reflect-metadata to be loaded before any imports that use decorators/DI.
import 'reflect-metadata';

// Add global mocks / matchers here when needed.

// Older Jest/jsdom runtimes used by some local Obsidian dev environments do not expose structuredClone.
if (typeof globalThis.structuredClone !== 'function') {
  (globalThis as any).structuredClone = (value: unknown) => JSON.parse(JSON.stringify(value));
}
