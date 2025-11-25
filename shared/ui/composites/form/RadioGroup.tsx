// src/shared/components/form/RadioGroup.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Field, Radio } from '../../FieldRadio';

interface RadioOption {
  value: string;
  label: string;
  icon?: string; // 可选的图标
}

interface RadioGroupProps {
  label: string;
  options: RadioOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  name?: string;
}

export function RadioGroup({ label, options, selectedValue, onChange, name }: RadioGroupProps) {
  // 如果没有选项，不渲染任何东西
  if (!options || options.length === 0) {
    return null;
  }

  return (
    <Field label={label}>
      {options.map(opt => (
        <Radio
          key={opt.value}
          name={name}
          value={opt.value}
          label={`${opt.icon ? opt.icon + ' ' : ''}${opt.label}`}
          checked={selectedValue === opt.value}
          onChange={() => onChange(opt.value)}
        />
      ))}
    </Field>
  );
}