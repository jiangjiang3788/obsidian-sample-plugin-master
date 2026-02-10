// src/app/runtime/lifecycleState.ts
// A tiny global flag to prevent any writes after plugin unload/reload.
// This is intentionally simple: set once on cleanup, read from platform adapters.
let disposed = false;

export function markDisposed(): void {
  disposed = true;
}

export function isDisposed(): boolean {
  return disposed;
}

// Useful for tests/dev hot reload (should not be used in production code paths).
export function _resetDisposedForDev(): void {
  disposed = false;
}

// Jest helper (explicit name to discourage accidental use in prod paths)
export function resetDisposedForTests(): void {
  disposed = false;
}
