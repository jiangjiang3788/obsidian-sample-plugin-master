import type { TemplateField } from '@core/types/public';

import { normalizeQuickInputChoices } from '../components/quickInputOptionSelection';
import type { QuickInputFieldChoice, QuickInputFieldValueOptions } from './types';

export function getQuickInputFieldChoices(
  field: TemplateField,
  fieldValueOptionsByKey?: QuickInputFieldValueOptions,
): QuickInputFieldChoice[] {
  const direct = normalizeQuickInputChoices(field.options) as QuickInputFieldChoice[];
  const injected = fieldValueOptionsByKey?.[field.key] || fieldValueOptionsByKey?.[field.label || ''] || [];
  if (!injected.length) return direct;

  const seen = new Set<string>();
  return [
    ...direct,
    ...injected.map((option) => ({
      value: option.value,
      label: option.label || option.value,
      icon: option.icon,
    })),
  ].filter((option) => {
    if (!option.value || seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });
}
