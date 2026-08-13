/** @jsxImportSource preact */
import { h } from 'preact';
import { ThinkCheckbox, ThinkInput } from '@shared/ui/public';
import type { ViewEditorProps } from './ViewEditorProps';
import { PROGRESS_VIEW_DEFAULT_CONFIG } from '@core/view/public';
import { ConfigFieldRow, ConfigSection, ViewEditorShell } from './settingsEditorUi';

export { PROGRESS_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/view/public';

/** ProgressView 只做目标经验卡片。筛选由统一筛选面板负责。 */
export function ProgressViewEditor({ value, onChange }: ViewEditorProps) {
  const config = { ...PROGRESS_VIEW_DEFAULT_CONFIG, ...value, mode: 'goal' };
  const numberPatch = (key: string, fallback: number) => (event: Event) => onChange({ mode: 'goal', [key]: Number((event.currentTarget as HTMLInputElement).value) || fallback });
  return (
    <ViewEditorShell title="进度视图">
      <ConfigSection>
        <ConfigFieldRow label="目标数量"><ThinkInput className="think-settings-field--sm" type="number" value={config.topN} onInput={numberPatch('topN', 20)} /></ConfigFieldRow>
        <ConfigFieldRow label="每条记录 XP"><ThinkInput className="think-settings-field--sm" type="number" value={config.basePoints} onInput={numberPatch('basePoints', 1)} /></ConfigFieldRow>
        <ConfigFieldRow label="每级 XP"><ThinkInput className="think-settings-field--sm" type="number" value={config.levelStep} onInput={numberPatch('levelStep', 20)} /></ConfigFieldRow>
        <ConfigFieldRow label="评分阈值"><ThinkInput className="think-settings-field--sm" type="number" value={config.ratingBonusThreshold} onInput={numberPatch('ratingBonusThreshold', 4)} /></ConfigFieldRow>
        <ConfigFieldRow label="评分额外积分"><ThinkInput className="think-settings-field--sm" type="number" value={config.ratingBonusPoints} onInput={numberPatch('ratingBonusPoints', 0)} /></ConfigFieldRow>
        <ConfigFieldRow label="展开统计"><ThinkCheckbox checked={config.showCategoryBreakdown !== false} onChange={(event) => onChange({ mode: 'goal', showCategoryBreakdown: (event.currentTarget as HTMLInputElement).checked })} label="显示 Block 统计" compact /></ConfigFieldRow>
      </ConfigSection>
    </ViewEditorShell>
  );
}
