/** @jsxImportSource preact */
import { h } from 'preact';
import { Checkbox, FormControlLabel, Stack, TextField, Typography } from '@shared/ui/public';
import { ENERGY_VIEW_DEFAULT_CONFIG } from '@core/view/public';
import type { ViewEditorProps } from './ViewEditorProps';

export { ENERGY_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/view/public';

export function EnergyViewEditor({ value, onChange }: ViewEditorProps) {
  const config = { ...ENERGY_VIEW_DEFAULT_CONFIG, ...value };
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        EnergyView 跟随布局当前的 年 / 季 / 月 / 周 / 天周期。任务按目标分组，每个目标固定显示日常 / 天 / 周 / 月 / 季 / 年六类；当前精力只影响任务排序，不改变任务所属类型。
      </Typography>
      <Stack direction="row" spacing={2}>
        <TextField size="small" type="number" label="最近原始记录" value={config.recentSampleLimit} onChange={(e) => onChange({ recentSampleLimit: Math.max(1, Math.min(20, Number((e.target as HTMLInputElement).value) || 5)) })} />
        <TextField size="small" type="number" label="最多精力目标数" value={config.maxGoals} onChange={(e) => onChange({ maxGoals: Math.max(0, Math.min(20, Number((e.target as HTMLInputElement).value) || 0)) })} />
        <TextField size="small" type="number" label="历史分析窗口" value={config.analysisWindowDays} onChange={(e) => onChange({ analysisWindowDays: Math.max(7, Math.min(90, Number((e.target as HTMLInputElement).value) || 30)) })} />
      </Stack>
      <TextField size="small" label="精力目标路径（可选）" value={config.goalPath} placeholder="留空 = 所有有精力记录的目标" onChange={(e) => onChange({ goalPath: (e.target as HTMLInputElement).value })} />
      <FormControlLabel control={<Checkbox checked={config.showTimeline !== false} onChange={(e) => onChange({ showTimeline: (e.target as HTMLInputElement).checked })} />} label="显示精力地图" />
      <Typography variant="body2" color="text.secondary">
        数据质量、时间规律和活动影响继续用于“本周期”短句与后台任务排序；原“更多”诊断区已退出主界面，不再单独堆统计项。
      </Typography>
    </Stack>
  );
}
