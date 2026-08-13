/** @jsxImportSource preact */
import { h } from 'preact';
import type { ViewEditorProps } from './ViewEditorProps';
import { TABLE_VIEW_DEFAULT_CONFIG } from '@core/view/public';
import { FieldPickerAutocomplete } from './FieldPickerAutocomplete';
import { ConfigFieldRow, ConfigSection, ViewEditorShell } from './settingsEditorUi';

export { TABLE_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/view/public';

export function TableViewEditor({ value, onChange, fieldOptions }: ViewEditorProps) {
  return (
    <ViewEditorShell title="交叉表（TableView）">
      <ConfigSection title="字段映射">
        <ConfigFieldRow label="行字段"><FieldPickerAutocomplete options={fieldOptions} value={value.rowField ?? ''} onChange={v => onChange({ rowField: v ?? '' })} /></ConfigFieldRow>
        <ConfigFieldRow label="列字段"><FieldPickerAutocomplete options={fieldOptions} value={value.colField ?? ''} onChange={v => onChange({ colField: v ?? '' })} /></ConfigFieldRow>
      </ConfigSection>
    </ViewEditorShell>
  );
}
