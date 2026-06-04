export interface QuickInputChoice {
  value: string;
  label: string;
}

function readObjectField(value: unknown, key: 'value' | 'label'): unknown {
  if (!value || typeof value !== 'object') return undefined;
  return (value as Record<string, unknown>)[key];
}

export function normalizeQuickInputChoices(options: unknown[] | undefined): QuickInputChoice[] {
  if (!Array.isArray(options)) return [];

  return options
    .map((option) => {
      const objectValue = readObjectField(option, 'value');
      const objectLabel = readObjectField(option, 'label');
      const rawValue = objectValue ?? objectLabel ?? option;
      const rawLabel = objectLabel ?? objectValue ?? option;
      const value = String(rawValue ?? '').trim();
      const label = String(rawLabel ?? '').trim();
      if (!value && !label) return null;
      return {
        value: value || label,
        label: label || value,
      } satisfies QuickInputChoice;
    })
    .filter((choice): choice is QuickInputChoice => !!choice);
}

export function getQuickInputSelectedValue(value: unknown): string {
  const objectValue = readObjectField(value, 'value');
  const objectLabel = readObjectField(value, 'label');
  return String(objectValue ?? objectLabel ?? value ?? '').trim();
}

export function isQuickInputChoiceSelected(value: unknown, choice: QuickInputChoice): boolean {
  const selectedValue = getQuickInputSelectedValue(value);
  if (!selectedValue) return false;
  return selectedValue === choice.value || selectedValue === choice.label;
}

export function toQuickInputOptionObject(choice: QuickInputChoice): { value: string; label: string } {
  return { value: choice.value, label: choice.label };
}
