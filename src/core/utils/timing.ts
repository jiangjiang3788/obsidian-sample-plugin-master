// src/core/utils/timing.ts
/**
 * Timing utility SSOT.
 * UI and core AI tracing should share the same monotonic-clock fallback rules.
 */
export function nowMs(): number {
  try {
    return performance.now();
  } catch {
    return Date.now();
  }
}

export function durationMs(start: number): number {
  return nowMs() - start;
}

export function elapsedMs(start: number): string {
  return `${durationMs(start).toFixed(2)}ms`;
}

export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  wait = 250
): T {
  let last = 0, timer: any = null;
  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn.apply(this, args);
    } else {
      clearTimeout(timer);
      timer = setTimeout(() => {
        last = Date.now();
        fn.apply(this, args);
      }, wait - (now - last));
    }
  } as T;
}
