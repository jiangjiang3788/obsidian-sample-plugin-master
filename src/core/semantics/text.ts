/**
 * Central text normalization semantics.
 *
 * Keep raw string trimming / token casing rules here so goal, field, view and
 * AI adapters do not each define slightly different compactText helpers.
 */
export function compactText(value: unknown): string {
  return String(value ?? '').trim();
}

export function normalizeTextToken(value: unknown): string {
  return compactText(value).toLowerCase();
}
