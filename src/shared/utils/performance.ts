import { devError, devWarn } from '@core/utils/public';

const WARNING_MS = 1000;
const ERROR_MS = 5000;

const now = (): number => (
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
);

/** Lightweight bootstrap timing. Call the returned function to finish the measure. */
export function startMeasure(name: string): () => number {
  const startedAt = now();
  return () => {
    const duration = now() - startedAt;
    if (duration >= ERROR_MS) {
      devError(`[Performance] SLOW: ${name} took ${duration.toFixed(2)}ms`);
    } else if (duration >= WARNING_MS) {
      devWarn(`[Performance] Warning: ${name} took ${duration.toFixed(2)}ms`);
    }
    return duration;
  };
}
