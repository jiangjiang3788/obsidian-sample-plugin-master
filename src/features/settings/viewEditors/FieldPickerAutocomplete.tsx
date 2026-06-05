// src/features/settings/viewEditors/FieldPickerAutocomplete.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { Autocomplete, TextField } from '@shared/public';
import type { SxProps, Theme } from '@mui/material/styles';
import type { FieldPickerOption } from '@core/public';
import { getFieldLabel, getFieldPickerOptions } from '@core/public';

type PickerOption = FieldPickerOption | string;

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
  sx?: SxProps<Theme>;
}

function getPickerOptionValue(option: PickerOption | null | undefined): string {
  if (!option) return '';
  return typeof option === 'string' ? option : option.value;
}

function getPickerOptionLabel(option: PickerOption): string {
  if (typeof option === 'string') return getFieldLabel(option);
  return option.label || getFieldLabel(option.value);
}

function getPickerOptionGroup(option: PickerOption): string {
  return typeof option === 'string' ? '其他字段' : option.group || '其他字段';
}

function normalizePickerValue(value: unknown): string {
  return String(value ?? '').trim();
}

/**
 * 统一字段选择器。
 *
 * 所有视图配置里的字段选择都按「核心字段 / 文件字段 / 自定义字段」展示。
 * 默认允许自定义输入，避免打开旧配置时丢失未知字段。
 */
export function FieldPickerAutocomplete({
  value = '',
  options,
  onChange,
  label,
  placeholder = '搜索 / 选择字段',
  helperText,
  fullWidth = true,
  size = 'small',
  disableClearable = true,
  allowCustom = true,
  sx,
}: FieldPickerAutocompleteProps) {
  const pickerOptions = useMemo(() => getFieldPickerOptions(options), [options]);
  const selectedValue = useMemo<PickerOption>(() => (
    pickerOptions.find(option => option.value === value) || value || ''
  ), [pickerOptions, value]);

  return (
    <Autocomplete
      freeSolo={allowCustom}
      disablePortal
      fullWidth={fullWidth}
      size={size}
      disableClearable={disableClearable}
      options={pickerOptions as PickerOption[]}
      groupBy={getPickerOptionGroup}
      getOptionLabel={getPickerOptionLabel}
      isOptionEqualToValue={(option: PickerOption, current: PickerOption) => (
        getPickerOptionValue(option) === getPickerOptionValue(current)
      )}
      value={selectedValue as any}
      onChange={(_, nextValue: any) => onChange(normalizePickerValue(getPickerOptionValue(nextValue)))}
      onInputChange={(_, nextInput: string, reason: string) => {
        if (!allowCustom) return;
        if (reason !== 'input' && reason !== 'clear') return;
        onChange(normalizePickerValue(nextInput));
      }}
      sx={sx}
      renderInput={(params: any) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          helperText={helperText}
          variant="outlined"
        />
      )}
    />
  );
}
