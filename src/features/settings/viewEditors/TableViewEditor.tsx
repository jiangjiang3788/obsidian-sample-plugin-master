// src/features/dashboard/settings/ModuleEditors/TableViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Stack, Typography } from '@shared/public';
import type { ViewEditorProps } from './registry';
import { TABLE_VIEW_DEFAULT_CONFIG } from '@core/public';
import { FieldPickerAutocomplete } from './FieldPickerAutocomplete';

// 重新导出以保持兼容性
export { TABLE_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/public';

export function TableViewEditor({ value, onChange, fieldOptions }: ViewEditorProps) {
  return (
    <Stack spacing={2}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            交叉表（TableView）根据两个字段来创建二维表格。
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
            <FieldPickerAutocomplete
                label="行字段"
                options={fieldOptions}
                value={value.rowField ?? ''}
                onChange={v => onChange({ rowField: v ?? '' })}
            />
            <FieldPickerAutocomplete
                label="列字段"
                options={fieldOptions}
                value={value.colField ?? ''}
                onChange={v => onChange({ colField: v ?? '' })}
            />
        </Stack>
    </Stack>
  );
}
