// src/shared/utils/diagnosticConsole.ts
// ---------------------------------------------------------------------------
// Centralized dev-only console bridge.
//
// Production UI paths must not call console.* directly. Route diagnostics here
// so the output is controlled by the existing developer console setting.
// ---------------------------------------------------------------------------

import { isDevConsoleStackEnabled } from './devConsole';

type ConsoleLevel = 'log' | 'warn' | 'error' | 'info' | 'trace';

function emit(level: ConsoleLevel, args: unknown[]): void {
  if (!isDevConsoleStackEnabled()) return;
  try {
    const method = console[level];
    if (typeof method === 'function') {
      method.apply(console, args as []);
    }
  } catch {
    // no-op: diagnostics must never break runtime behavior
  }
}

export function diagnosticLog(...args: unknown[]): void {
  emit('log', args);
}

export function diagnosticInfo(...args: unknown[]): void {
  emit('info', args);
}

export function diagnosticWarn(...args: unknown[]): void {
  emit('warn', args);
}

export function diagnosticError(...args: unknown[]): void {
  emit('error', args);
}

export function diagnosticTrace(...args: unknown[]): void {
  emit('trace', args);
}
