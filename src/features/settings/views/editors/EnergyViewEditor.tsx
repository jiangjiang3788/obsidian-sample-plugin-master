/** @jsxImportSource preact */
import { h } from 'preact';
import { SimpleSelect, ThinkCheckbox, ThinkInput } from '@shared/ui/public';
import { ENERGY_VIEW_DEFAULT_CONFIG } from '@core/view/public';
import type { ViewEditorProps } from './ViewEditorProps';
import { ConfigFieldRow, ConfigSection, ViewEditorShell } from './settingsEditorUi';

export { ENERGY_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/view/public';

export function EnergyViewEditor({ value, onChange }: ViewEditorProps) {
  const config = { ...ENERGY_VIEW_DEFAULT_CONFIG, ...value };
  return (
    <ViewEditorShell title="精力视图">
      <ConfigSection>
        <ConfigFieldRow label="最近记录"><ThinkInput className="think-settings-field--sm" type="number" min={1} max={20} value={config.recentSampleLimit} onInput={(e) => onChange({ recentSampleLimit: Math.max(1, Math.min(20, Number((e.currentTarget as HTMLInputElement).value) || 5)) })} /></ConfigFieldRow>
        <ConfigFieldRow label="目标上限"><ThinkInput className="think-settings-field--sm" type="number" min={0} max={20} value={config.maxGoals} onInput={(e) => onChange({ maxGoals: Math.max(0, Math.min(20, Number((e.currentTarget as HTMLInputElement).value) || 0)) })} /></ConfigFieldRow>
        <ConfigFieldRow label="分析窗口"><ThinkInput className="think-settings-field--sm" type="number" min={7} max={90} value={config.analysisWindowDays} onInput={(e) => onChange({ analysisWindowDays: Math.max(7, Math.min(90, Number((e.currentTarget as HTMLInputElement).value) || 30)) })} /></ConfigFieldRow>
        <ConfigFieldRow label="目标路径"><ThinkInput value={config.goalPath} placeholder="留空 = 所有有精力记录的目标" onInput={(e) => onChange({ goalPath: (e.currentTarget as HTMLInputElement).value })} /></ConfigFieldRow>
        <ConfigFieldRow label="当前场景"><SimpleSelect value={config.currentContext} options={[{ value: 'any', label: '任意' }, { value: 'work', label: '工作' }, { value: 'home', label: '家' }, { value: 'commute', label: '通勤' }, { value: 'out', label: '外出' }]} onChange={(currentContext) => onChange({ currentContext: currentContext as any })} fullWidth /></ConfigFieldRow>
        <ConfigFieldRow label="精力地图"><ThinkCheckbox checked={config.showTimeline !== false} onChange={(e) => onChange({ showTimeline: (e.currentTarget as HTMLInputElement).checked })} label="显示" compact /></ConfigFieldRow>
      </ConfigSection>
    </ViewEditorShell>
  );
}
