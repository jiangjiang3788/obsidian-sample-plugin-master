// src/features/dashboard/settings/ModuleEditors/TableViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Stack, TextField, Autocomplete, Typography } from '@mui/material';
import type { ViewEditorProps } from './registry';

export const DEFAULT_CONFIG = {
  view: 'TableView' as const,
  title: '表格视图',
  collapsed: false,
  rowField: 'categoryKey',
  colField: 'date',
};

export function TableViewEditor({ value, onChange, fieldOptions }: ViewEditorProps) {
  return (
    <Stack spacing={2}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            交叉表（TableView）根据两个字段来创建二维表格。
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
            <Autocomplete
                freeSolo disablePortal fullWidth size="small"
                disableClearable // 移除清除按钮
                options={fieldOptions}
                value={value.rowField ?? ''}
                onChange={(_, v) => onChange({ rowField: v ?? '' })}
                renderInput={p => <TextField {...p} label="行字段" variant="outlined" />}
            />
            <Autocomplete
                freeSolo disablePortal fullWidth size="small"
                disableClearable // 移除清除按钮
                options={fieldOptions}
                value={value.colField ?? ''}
                onChange={(_, v) => onChange({ colField: v ?? '' })}
                renderInput={p => <TextField {...p} label="列字段" variant="outlined" />}
            />
        </Stack>
    </Stack>
  );
}