/** @jsxImportSource preact */
import { useMemo } from 'preact/hooks';
import { ThinkCombobox } from '@shared/ui/public';
import { getFieldPickerOptions } from '@core/fields/public';

export interface FieldPickerAutocompleteProps {
  value?: string;
  options: string[];
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  disableClearable?: boolean;
  allowCustom?: boolean;
  className?: string;
}

/**
 * Settings field picker facade.
 * Feature code consumes a Think primitive; the implementation detail lives in shared/ui.
 */
export function FieldPickerAutocomplete({
  value = '',
  options,
  onChange,
  placeholder = '搜索 / 选择字段',
  helperText,
  allowCustom = true,
  className,
}: FieldPickerAutocompleteProps) {
  const pickerOptions = useMemo(() => getFieldPickerOptions(options).map((option) => ({
    value: option.value,
    label: option.label || option.value,
    group: option.group || '其他字段',
  })), [options]);

  return (
    <ThinkCombobox
      value={value}
      options={pickerOptions}
      onChange={onChange}
      placeholder={placeholder}
      helperText={helperText}
      allowCustom={allowCustom}
      className={className}
    />
  );
}
