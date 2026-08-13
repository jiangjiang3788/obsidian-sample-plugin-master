/** @jsxImportSource preact */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ThinkIcon } from '../primitives/Icon';

export type ThinkComboboxOption = {
  value: string;
  label: string;
  group?: string;
};

export interface ThinkComboboxProps {
  value?: string;
  options: ThinkComboboxOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  allowCustom?: boolean;
  className?: string;
  disabled?: boolean;
}

function normalize(value: string): string {
  return String(value || '').trim().toLocaleLowerCase();
}

function filterOptions(options: ThinkComboboxOption[], query: string): ThinkComboboxOption[] {
  const needle = normalize(query);
  if (!needle) return options.slice(0, 80);
  return options.filter((option) => (
    normalize(option.label).includes(needle) || normalize(option.value).includes(needle) || normalize(option.group || '').includes(needle)
  )).slice(0, 80);
}

function closeLater(setOpen: (open: boolean) => void) {
  window.setTimeout(() => setOpen(false), 90);
}

function OptionMenu({ options, onSelect, emptyLabel = '无匹配项' }: {
  options: ThinkComboboxOption[];
  onSelect: (option: ThinkComboboxOption) => void;
  emptyLabel?: string;
}) {
  return (
    <div className="think-combobox-menu" role="listbox">
      {options.length ? options.map((option) => (
        <button
          key={`${option.group || ''}:${option.value}`}
          type="button"
          className="think-combobox-option"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(option)}
          role="option"
        >
          <span className="think-combobox-option__label">{option.label}</span>
          {option.group ? <span className="think-combobox-option__group">{option.group}</span> : null}
        </button>
      )) : <div className="think-combobox-option think-combobox-option--empty">{emptyLabel}</div>}
    </div>
  );
}

export function ThinkCombobox({
  value = '',
  options,
  onChange,
  placeholder = '搜索 / 选择',
  helperText,
  allowCustom = true,
  className,
  disabled = false,
}: ThinkComboboxProps) {
  const selectedLabel = useMemo(() => options.find((option) => option.value === value)?.label || value, [options, value]);
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  useEffect(() => setQuery(selectedLabel), [selectedLabel]);
  const filtered = useMemo(() => filterOptions(options, query), [options, query]);

  return (
    <div className={['think-combobox', className].filter(Boolean).join(' ')}>
      <div className="think-combobox-control">
        <input
          className="think-combobox-input"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onBlur={() => closeLater(setOpen)}
          onInput={(event) => {
            const next = (event.currentTarget as HTMLInputElement).value;
            setQuery(next);
            setOpen(true);
            if (allowCustom) onChange(next.trim());
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && filtered[0]) {
              event.preventDefault();
              setQuery(filtered[0].label);
              onChange(filtered[0].value);
              setOpen(false);
            }
            if (event.key === 'Escape') setOpen(false);
          }}
          role="combobox"
          aria-expanded={open}
        />
        <ThinkIcon className="think-combobox-control__icon" name="chevron-down" />
      </div>
      {open && !disabled ? <OptionMenu options={filtered} onSelect={(option) => {
        setQuery(option.label);
        onChange(option.value);
        setOpen(false);
      }} /> : null}
      {helperText ? <div className="think-combobox-helper">{helperText}</div> : null}
    </div>
  );
}

export interface ThinkMultiComboboxProps {
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function ThinkMultiCombobox({ values, options, onChange, placeholder = '搜索 / 选择', className, disabled = false }: ThinkMultiComboboxProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const normalizedValues = useMemo(() => new Set(values.map(normalize)), [values]);
  const filtered = useMemo<ThinkComboboxOption[]>(() => {
    const needle = normalize(query);
    return options
      .filter((option) => !normalizedValues.has(normalize(option)))
      .filter((option) => !needle || normalize(option).includes(needle))
      .slice(0, 80)
      .map((option) => ({ value: option, label: option }));
  }, [options, query, normalizedValues]);

  const addValue = (next: string) => {
    const clean = next.trim();
    if (!clean || normalizedValues.has(normalize(clean))) return;
    onChange([...values, clean]);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className={['think-multi-combobox', className].filter(Boolean).join(' ')}>
      <div className="think-combobox-control think-combobox-control--multi">
        {values.map((value) => (
          <span className="think-combobox-tag" key={value}>
            <span>{value}</span>
            <button
              type="button"
              className="think-combobox-tag__remove"
              aria-label={`移除 ${value}`}
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onChange(values.filter((item) => item !== value))}
            >×</button>
          </span>
        ))}
        <input
          className="think-combobox-input think-combobox-input--multi"
          value={query}
          disabled={disabled}
          placeholder={values.length ? '' : placeholder}
          onFocus={() => setOpen(true)}
          onBlur={() => closeLater(setOpen)}
          onInput={(event) => {
            setQuery((event.currentTarget as HTMLInputElement).value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              addValue(filtered[0]?.value || query);
            } else if (event.key === 'Backspace' && !query && values.length) {
              onChange(values.slice(0, -1));
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
          role="combobox"
          aria-expanded={open}
        />
        <ThinkIcon className="think-combobox-control__icon" name="chevron-down" />
      </div>
      {open && !disabled ? <OptionMenu options={filtered} onSelect={(option) => addValue(option.value)} emptyLabel={query ? '回车添加输入值' : '无可选项'} /> : null}
    </div>
  );
}

export interface ThinkSearchPickerProps {
  query: string;
  options: ThinkComboboxOption[];
  onQueryChange: (query: string) => void;
  onSelect: (value: string) => void;
  placeholder?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ThinkSearchPicker({
  query,
  options,
  onQueryChange,
  onSelect,
  placeholder = '搜索 / 选择',
  className,
  open: controlledOpen,
  onOpenChange,
}: ThinkSearchPickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    onOpenChange?.(next);
  };
  const filtered = useMemo(() => filterOptions(options, query), [options, query]);

  return (
    <div ref={rootRef} className={['think-search-picker', className].filter(Boolean).join(' ')}>
      <div className="think-combobox-control">
        <input
          className="think-combobox-input"
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 90)}
          onInput={(event) => {
            onQueryChange((event.currentTarget as HTMLInputElement).value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && filtered[0]) {
              event.preventDefault();
              onSelect(filtered[0].value);
              setOpen(false);
            }
            if (event.key === 'Escape') setOpen(false);
          }}
          role="combobox"
          aria-expanded={open}
        />
        <ThinkIcon className="think-combobox-control__icon" name="chevron-down" />
      </div>
      {open ? <OptionMenu options={filtered} onSelect={(option) => {
        onSelect(option.value);
        setOpen(false);
      }} /> : null}
    </div>
  );
}
