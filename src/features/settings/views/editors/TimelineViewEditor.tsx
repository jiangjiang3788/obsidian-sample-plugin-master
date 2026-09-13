/** @jsxImportSource preact */
import { h } from 'preact';
import { ThinkInput } from '@shared/ui/public';
import { TIMELINE_VIEW_DEFAULT_CONFIG, type TimelineViewConfig } from '@core/view/public';
import { ViewEditorProps } from './ViewEditorProps';
import { ConfigFieldRow, ConfigSection, ViewEditorShell } from './settingsEditorUi';

type TimelineConfigPatch = Partial<Pick<TimelineViewConfig, 'defaultHourHeight'>>;

export function TimelineViewEditor({ value, onChange }: ViewEditorProps) {
  const viewConfig: TimelineViewConfig = { ...TIMELINE_VIEW_DEFAULT_CONFIG, ...value };
  const handlePatch = (patch: TimelineConfigPatch) => onChange(patch as Record<string, any>);
  return (
    <ViewEditorShell title="时间线视图">
      <ConfigSection>
        <ConfigFieldRow label="小时高度">
          <ThinkInput
            className="think-settings-field--sm"
            type="number"
            min={20}
            max={200}
            value={viewConfig.defaultHourHeight}
            onInput={(event) => handlePatch({ defaultHourHeight: Number((event.currentTarget as HTMLInputElement).value) })}
          />
        </ConfigFieldRow>
      </ConfigSection>
    </ViewEditorShell>
  );
}
