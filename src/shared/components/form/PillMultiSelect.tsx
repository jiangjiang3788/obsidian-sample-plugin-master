// src/shared/components/form/PillMultiSelect.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Autocomplete, TextField } from '@mui/material';

function renderPills(value: readonly string[], getTagProps: any) {
  return (
    <span class="think-pills">
      {value.map((opt, index) => {
        const { onDelete, key, className, ...rest } = getTagProps({ index });
        return (
          <span
            key={key ?? index}
            class={`think-pill ${className || ''}`}
            onClick={onDelete}
            title="点击移除"
            {...rest}
          >
            {String(opt)}
          </span>
        );
      })}
    </span>
  );
}

export function PillMultiSelect({
  label, value, options, placeholder, onChange,
}: {
  label?: string;
  value: string[];
  options: string[];
  placeholder?: string;
  onChange: (v: string[]) => void;
}) {
  return (
    <div>
      {label ? <div style="margin:0 0 3px;color:#d00;font-weight:700;">{label}</div> : null}
      <Autocomplete
        multiple
        disablePortal
        options={options}
        value={value}
        onChange={(_, v)=>onChange(v as string[])}
        renderTags={renderPills as any}
        renderInput={p => <TextField {...p} placeholder={placeholder ?? '选择或输入字段'} />}
      />
    </div>
  );
}