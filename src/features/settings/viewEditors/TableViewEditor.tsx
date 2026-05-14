// src/features/dashboard/settings/ModuleEditors/TableViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Stack, TextField, Autocomplete, Typography } from '@mui/material';
import type { ViewEditorProps } from './registry';
import { TABLE_VIEW_DEFAULT_CONFIG, getFieldLabel } from '@core/public';

// 重新导出以保持兼容性
export { TABLE_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/public';

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
                getOptionLabel={(option: string) => getFieldLabel(option)}
                value={value.rowField ?? ''}
                onChange={(_, v) => onChange({ rowField: v ?? '' })}
                renderInput={(p: any) => <TextField {...(p as any)} label="行字段" variant="outlined" />}
            />
            <Autocomplete
                freeSolo disablePortal fullWidth size="small"
                disableClearable // 移除清除按钮
                options={fieldOptions}
                getOptionLabel={(option: string) => getFieldLabel(option)}
                value={value.colField ?? ''}
                onChange={(_, v) => onChange({ colField: v ?? '' })}
                renderInput={(p: any) => <TextField {...(p as any)} label="列字段" variant="outlined" />}
            />
        </Stack>
    </Stack>
  );
}
