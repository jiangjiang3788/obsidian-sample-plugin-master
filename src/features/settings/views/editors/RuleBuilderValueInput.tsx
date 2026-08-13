/** @jsxImportSource preact */
import { h } from 'preact';
import { ThinkCombobox, ThinkMultiCombobox } from '@shared/ui/public';
import type { FilterRule } from '@core/types/public';
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

  const options = (uniqueFieldValues[rule.field] || []).map((value) => ({ value, label: value }));

  if (isMultiValueOperator(rule.op)) {
    return (
      <ThinkMultiCombobox
        values={normalizeMultiValue(rule.value)}
        options={uniqueFieldValues[rule.field] || []}
        onChange={(newValues) => onValueChange(normalizeMultiValue(newValues))}
        placeholder={getRuleValuePlaceholder(rule.op)}
      />
    );
  }

  return (
    <ThinkCombobox
      value={String(rule.value ?? '')}
      options={options}
      onChange={(newValue) => onValueChange(newValue || '')}
      placeholder={getRuleValuePlaceholder(rule.op)}
      allowCustom
    />
  );
}
