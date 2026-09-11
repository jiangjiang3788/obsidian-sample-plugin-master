// A tiny global lifecycle flag to prevent any Vault writes after plugin unload/reload.
// Important: Obsidian can hot-reload a plugin while preserving the JS module instance,
// so every onload must explicitly reactivate the lifecycle state.
let disposed = false;

export function markActive(): void {
  disposed = false;
}

export function markDisposed(): void {
  disposed = true;
}

export function isDisposed(): boolean {
  return disposed;
}

// Backward-compatible dev helper.
export function _resetDisposedForDev(): void {
  markActive();
}

// Jest helper (explicit name to discourage accidental use in prod paths)
export function resetDisposedForTests(): void {
  markActive();
}
