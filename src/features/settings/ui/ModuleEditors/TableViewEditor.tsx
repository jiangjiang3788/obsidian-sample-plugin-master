// src/features/settings/ui/ModuleEditors/TableViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Stack, TextField, Autocomplete } from '@mui/material';

export function TableViewEditor({
  value, onChange, fieldOptions,
}: {
  value: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
  fieldOptions: string[];
}) {
  return (
    <div>
      <div class="view-meta" style="--c:#2b7fff">
        <span class="dot"></span>表格视图：仅“行/列字段”生效
      </div>
      <Stack direction="row" spacing={0.6}>
        <Autocomplete
          freeSolo disablePortal options={fieldOptions}
          value={value.rowField ?? ''}
          onChange={(_, v)=>onChange({ rowField: v ?? '' })}
          renderInput={p=> <TextField {...p} label="行字段" />}
          sx={{flex:1}}
        />
        <Autocomplete
          freeSolo disablePortal options={fieldOptions}
          value={value.colField ?? ''}
          onChange={(_, v)=>onChange({ colField: v ?? '' })}
          renderInput={p=> <TextField {...p} label="列字段" />}
          sx={{flex:1}}
        />
      </Stack>
    </div>
  );
}