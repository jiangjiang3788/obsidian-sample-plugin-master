/**
 * Central option / label-value semantics.
 *
 * Select, radio, rating, quick-input pills, edit backfill and output planning
 * all deal with values that may be primitives or { value, label } objects.
 * Keep the reading and matching rules here so those flows do not drift apart.
 */
export interface OptionLikeValue {
  value?: unknown;
  label?: unknown;
  icon?: unknown;
}

export interface OptionText {
  value: string;
  label: string;
}

export interface FindMatchingOptionOptions {
  /** Normalize values before comparing. Useful for hierarchy paths. */
  normalize?: (value: unknown) => string | null | undefined;
  /** Also compare the leaf segment of normalized path values. */
  matchLeaf?: boolean;
}

export function isOptionLikeValue(value: unknown): value is OptionLikeValue {
  return !!value && typeof value === 'object' && ('value' in value || 'label' in value);
}

export function readOptionText(value: unknown): OptionText {
  if (isOptionLikeValue(value)) {
    const rawValue = value.value ?? value.label;
    const rawLabel = value.label ?? value.value;
    const optionValue = String(rawValue ?? '').trim();
    const optionLabel = String(rawLabel ?? '').trim();
    return {
      value: optionValue || optionLabel,
      label: optionLabel || optionValue,
    };
  }
  const text = String(value ?? '').trim();
  return { value: text, label: text };
}

export function normalizeOptionLikeValue(value: unknown): OptionLikeValue | null {
  const text = readOptionText(value);
  if (!text.value && !text.label) return null;
  return { value: text.value || text.label, label: text.label || text.value };
}

function readComparableValues(value: unknown, options: FindMatchingOptionOptions = {}): string[] {
  const text = readOptionText(value);
  const rawValues = [text.value, text.label].map((entry) => String(entry ?? '').trim()).filter(Boolean);
  const values = new Set<string>(rawValues);
  if (options.normalize) {
    for (const raw of rawValues) {
      const normalized = options.normalize(raw);
      if (normalized) {
        values.add(normalized);
        if (options.matchLeaf) {
          values.add(normalized.split('/').filter(Boolean).pop() || normalized);
        }
      }
    }
  }
  return Array.from(values);
}

export function findMatchingOption<T extends OptionLikeValue>(
  options: readonly T[] | null | undefined,
  rawValue: unknown,
  matchOptions: FindMatchingOptionOptions = {},
): T | undefined {
  if (!Array.isArray(options) || options.length === 0) return undefined;
  const rawComparable = new Set(readComparableValues(rawValue, matchOptions));
  if (rawComparable.size === 0) return undefined;

  return options.find((option) => {
    const optionComparable = readComparableValues(option, matchOptions);
    return optionComparable.some((entry) => rawComparable.has(entry));
  });
}

export function toOptionObject(value: unknown): { value: string; label: string } | null {
  const normalized = normalizeOptionLikeValue(value);
  if (!normalized) return null;
  return {
    value: String(normalized.value ?? '').trim(),
    label: String(normalized.label ?? normalized.value ?? '').trim(),
  };
}
