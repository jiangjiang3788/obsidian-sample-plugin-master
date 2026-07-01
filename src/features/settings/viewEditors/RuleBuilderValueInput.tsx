/** @jsxImportSource preact */
import { h } from 'preact';
import { Autocomplete, TextField } from '@shared/ui/public';
import type { FilterRule } from '@core/types/public';
import {
  getRuleValuePlaceholder,
  isMultiValueOperator,
  normalizeMultiValue,
  operatorNeedsValue,
  type RuleBuilderVariant,
} from './RuleBuilderModel';

interface RuleBuilderValueInputProps {
  rule: FilterRule;
  uniqueFieldValues: Record<string, string[]>;
  variant: RuleBuilderVariant;
  onValueChange: (value: any) => void;
}

export function RuleBuilderValueInput({ rule, uniqueFieldValues, variant, onValueChange }: RuleBuilderValueInputProps) {
  if (!operatorNeedsValue(rule.op)) return null;

  if (isMultiValueOperator(rule.op)) {
    return (
      <Autocomplete
        multiple
        freeSolo
        fullWidth
        size="small"
        disablePortal
        options={uniqueFieldValues[rule.field] || []}
        value={normalizeMultiValue(rule.value)}
        onChange={(_, newValue: string[]) => onValueChange(normalizeMultiValue(newValue))}
        renderInput={(params: any) => (
          <TextField
            {...params}
            variant="outlined"
            placeholder={getRuleValuePlaceholder(rule.op)}
            helperText={variant === 'panel' ? '同一字段内多选表示“或”：匹配其中任一值即可。' : undefined}
          />
        )}
      />
    );
  }

  return (
    <Autocomplete
      freeSolo
      fullWidth
      size="small"
      disableClearable
      disablePortal
      options={uniqueFieldValues[rule.field] || []}
      value={String(rule.value ?? '')}
      inputValue={String(rule.value ?? '')}
      onInputChange={(_, newValue: string) => onValueChange(newValue || '')}
      renderInput={(params: any) => <TextField {...params} variant="outlined" placeholder={getRuleValuePlaceholder(rule.op)} />}
    />
  );
}
