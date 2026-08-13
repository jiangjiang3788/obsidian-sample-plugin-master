/** @jsxImportSource preact */
import { h } from 'preact';

import { SelectablePill } from './SelectablePill';
import type { QuickInputChoice } from './quickInputOptionSelection';
import { isQuickInputChoiceSelected, toQuickInputOptionObject } from './quickInputOptionSelection';

export interface QuickInputOptionPillGroupProps {
  label: string;
  choices: QuickInputChoice[];
  value: unknown;
  onSelect: (value: { value: string; label: string }) => void;
  compact?: boolean;
}

export function QuickInputOptionPillGroup({
  label,
  choices,
  value,
  onSelect,
}: QuickInputOptionPillGroupProps) {
  if (choices.length === 0) return null;

  return (
    <div className="think-qif-choice-row" role="group" aria-label={label}>
      {choices.map((choice) => {
        const selected = isQuickInputChoiceSelected(value, choice);
        return (
          <SelectablePill
            key={`${choice.value}-${choice.label}`}
            selected={selected}
            onClick={() => onSelect(toQuickInputOptionObject(choice))}
            title={choice.label}
            className="think-quick-input-selectable-pill--single"
          >
            {choice.label}
          </SelectablePill>
        );
      })}
    </div>
  );
}
