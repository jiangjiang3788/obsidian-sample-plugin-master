export interface NormalizeViewMultiValueOptions {
  dedupe?: boolean;
}

/**
 * View/filter multi-value SSOT.
 * Accepts scalar, array or comma/newline-separated text and returns trimmed values.
 */
export function normalizeViewMultiValue(value: unknown, options: NormalizeViewMultiValueOptions = {}): string[] {
  const rawValues = Array.isArray(value) ? value : [value];
  const normalized = rawValues
    .flatMap(v => String(v ?? '').split(/[,，\n]/))
    .map(part => part.trim())
    .filter(Boolean);
  return options.dedupe === false ? normalized : Array.from(new Set(normalized));
}
