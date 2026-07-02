// src/features/dashboard/settings/ModuleEditors/TableViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Stack } from '@shared/ui/public';
import type { ViewEditorProps } from './registry';
import { TABLE_VIEW_DEFAULT_CONFIG } from '@core/view/public';
import { FieldPickerAutocomplete } from './FieldPickerAutocomplete';
import { ConfigSection, ViewEditorShell } from './settingsEditorUi';

// 重新导出以保持兼容性
export { TABLE_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/view/public';

export function TableViewEditor({ value, onChange, fieldOptions }: ViewEditorProps) {
  return (
    <ViewEditorShell
      title="交叉表（TableView）"
      description="根据两个字段创建二维表格。"
    >
      <ConfigSection title="字段映射">
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
      </ConfigSection>
    </ViewEditorShell>
  );
}
