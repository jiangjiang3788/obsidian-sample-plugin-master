/** @jsxImportSource preact */
import { h } from 'preact';
import { SimpleSelect, ThinkCheckbox, ThinkInput } from '@shared/ui/public';
import type { ViewEditorProps } from './ViewEditorProps';
import { STATISTICS_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/view/public';
import { ConfigFieldRow, ConfigSection, ViewEditorShell } from './settingsEditorUi';

export { DEFAULT_CONFIG };
const DISPLAY_MODE_OPTIONS = [
  { value: 'smart', label: '智能' },
  { value: 'linear', label: '线性' },
  { value: 'logarithmic', label: '对数' },
];

export function StatisticsViewEditor({ value, onChange }: ViewEditorProps) {
  const config = { ...DEFAULT_CONFIG, ...value, groupBy: 'goal' };
  return (
    <ViewEditorShell className="think-statistics-editor">
      <ConfigSection className="think-statistics-editor__section" title="目标统计视图" titleClassName="think-statistics-editor__title">
        <ConfigFieldRow label="显示目标数量"><ThinkInput className="think-settings-field--sm" type="number" min={1} value={config.topN || 10} onInput={(event) => onChange({ groupBy: 'goal', topN: Number((event.currentTarget as HTMLInputElement).value) || 10 })} /></ConfigFieldRow>
        <ConfigFieldRow label="柱状高度模式"><SimpleSelect value={config.displayMode || 'smart'} options={DISPLAY_MODE_OPTIONS} onChange={(displayMode) => onChange({ groupBy: 'goal', displayMode })} /></ConfigFieldRow>
        <ConfigFieldRow label="最小可见高度"><ThinkInput className="think-settings-field--sm" type="number" min={1} max={100} value={config.minVisibleHeight || 15} onInput={(event) => onChange({ groupBy: 'goal', minVisibleHeight: Number((event.currentTarget as HTMLInputElement).value) || 15 })} /></ConfigFieldRow>
        <ConfigFieldRow label="周期字段"><ThinkCheckbox checked={!!config.usePeriodField} onChange={(event) => onChange({ groupBy: 'goal', usePeriodField: (event.currentTarget as HTMLInputElement).checked })} label="默认按照周期显示" compact /></ConfigFieldRow>
      </ConfigSection>
    </ViewEditorShell>
  );
}
