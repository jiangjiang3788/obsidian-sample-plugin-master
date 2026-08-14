/** @jsxImportSource preact */
import { h } from 'preact';

import { QuickInputOptionPillGroup } from '../components/QuickInputOptionPillGroup';
import { isQuickInputChoiceSelected } from '../components/quickInputOptionSelection';
import { SelectablePill } from '../components/SelectablePill';
import { templateFieldValueToArray } from '@core/fields/public';

import { QuickInputFieldFrame } from './FieldFrame';
import { getQuickInputFieldChoices } from './fieldChoices';
import { isQuickInputInlineRowField } from './fieldSemantics';
import type { QuickInputFieldRendererBaseProps, QuickInputFieldValueOptions } from './types';

interface OptionFieldRendererProps extends QuickInputFieldRendererBaseProps {
  fieldValueOptionsByKey?: QuickInputFieldValueOptions;
}

export function QuickInputRadioFieldRenderer({
  field,
  displayLabel,
  rawValue,
  dense,
  onUpdate,
}: QuickInputFieldRendererBaseProps) {
  const control = (
    <QuickInputOptionPillGroup
      label={displayLabel}
      choices={getQuickInputFieldChoices(field)}
      value={rawValue}
      compact={dense}
      onSelect={(choice) => onUpdate(field.key, choice, true)}
    />
  );
  return (
    <QuickInputFieldFrame label={field.label || field.key} required={field.required} inline={isQuickInputInlineRowField(field)}>
      {control}
    </QuickInputFieldFrame>
  );
}

export function QuickInputMultiSelectFieldRenderer({
  field,
  displayLabel,
  rawValue,
  onUpdate,
}: QuickInputFieldRendererBaseProps) {
  const selected = new Set(templateFieldValueToArray(rawValue));
  const choices = getQuickInputFieldChoices(field);
  return (
    <QuickInputFieldFrame label={field.label || field.key} required={field.required}>
      <div className="think-qif-choice-row">
        {choices.map((choice) => {
          const isSelected = selected.has(choice.value) || selected.has(choice.label);
          return (
            <SelectablePill
              key={`${choice.value}-${choice.label}`}
              selected={isSelected}
              onClick={() => {
                const next = new Set(selected);
                if (isSelected) {
                  next.delete(choice.value);
                  next.delete(choice.label);
                } else {
                  next.add(choice.value);
                }
                onUpdate(field.key, Array.from(next));
              }}
              title={choice.label}
            >
              {choice.label}
            </SelectablePill>
          );
        })}
      </div>
    </QuickInputFieldFrame>
  );
}

export function QuickInputSingleSelectFieldRenderer({
  field,
  value,
  rawValue,
  dense,
  fieldValueOptionsByKey,
  onUpdate,
}: OptionFieldRendererProps) {
  const choices = getQuickInputFieldChoices(field, fieldValueOptionsByKey);
  const control = choices.length ? (
    <QuickInputOptionPillGroup
      label={field.label || field.key}
      choices={choices}
      value={rawValue}
      compact={dense}
      onSelect={(choice) => {
        const canClear = !field.required && !field.defaultValue;
        onUpdate(field.key, canClear && isQuickInputChoiceSelected(rawValue, choice) ? '' : choice, true);
      }}
    />
  ) : (
    <input
      className="think-native-input"
      value={String(value || '')}
      onInput={(event) => onUpdate(field.key, (event.currentTarget as HTMLInputElement).value)}
      placeholder={field.type === 'path' ? '例如：生活/健康' : undefined}
    />
  );

  return (
    <QuickInputFieldFrame label={field.label || field.key} required={field.required} inline={isQuickInputInlineRowField(field)}>
      {control}
    </QuickInputFieldFrame>
  );
}
