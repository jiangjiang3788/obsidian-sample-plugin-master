/** @jsxImportSource preact */
import { h } from 'preact';
import { ThinkCombobox, ThinkMultiCombobox } from '@shared/ui/public';
import type { FilterRule } from '@core/types/public';
import { formatFieldValue } from '@core/fields/public';
import {
  getRuleValuePlaceholder,
  isMultiValueOperator,
  normalizeMultiValue,
  operatorNeedsValue,
} from './RuleBuilderModel';

interface RuleBuilderValueInputProps {
  rule: FilterRule;
  uniqueFieldValues: Record<string, string[]>;
  onValueChange: (value: any) => void;
}

export function RuleBuilderValueInput({ rule, uniqueFieldValues, onValueChange }: RuleBuilderValueInputProps) {
  if (!operatorNeedsValue(rule.op)) return null;

  const selectedValues = isMultiValueOperator(rule.op)
    ? normalizeMultiValue(rule.value)
    : [String(rule.value ?? '').trim()].filter(Boolean);
  const rawOptions = Array.from(new Set([...(uniqueFieldValues[rule.field] || []), ...selectedValues]));
  const options = rawOptions.map((value) => ({ value, label: formatFieldValue(rule.field, value) }));
  const allowCustom = rule.field !== 'coreBlock';

  if (isMultiValueOperator(rule.op)) {
    return (
      <ThinkMultiCombobox
        values={normalizeMultiValue(rule.value)}
        options={options}
        onChange={(newValues) => onValueChange(normalizeMultiValue(newValues))}
        placeholder={getRuleValuePlaceholder(rule.op)}
        allowCustom={allowCustom}
      />
    );
  }

  return (
    <ThinkCombobox
      value={String(rule.value ?? '')}
      options={options}
      onChange={(newValue) => onValueChange(newValue || '')}
      placeholder={getRuleValuePlaceholder(rule.op)}
      allowCustom={allowCustom}
    />
  );
}
