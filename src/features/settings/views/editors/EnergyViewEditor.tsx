/** @jsxImportSource preact */
import { h } from 'preact';
import { Checkbox, FormControlLabel, SimpleSelect, Stack, TextField, Typography } from '@shared/ui/public';
import { ENERGY_VIEW_DEFAULT_CONFIG } from '@core/view/public';
import type { ViewEditorProps } from './ViewEditorProps';

export { ENERGY_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/view/public';

export function EnergyViewEditor({ value, onChange }: ViewEditorProps) {
  const config = { ...ENERGY_VIEW_DEFAULT_CONFIG, ...value };
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        EnergyView 跟随布局当前的 年 / 季 / 月 / 周 / 天周期。顶部“现在适合”根据当前场景、任务价值、精力负荷、真实时长和个人历史给出轻量 Top 推荐；完整任务列表仍按目标与任务周期稳定分组。
      </Typography>
      <Stack direction="row" spacing={2}>
        <TextField size="small" type="number" label="最近原始记录" value={config.recentSampleLimit} onChange={(e) => onChange({ recentSampleLimit: Math.max(1, Math.min(20, Number((e.target as HTMLInputElement).value) || 5)) })} />
        <TextField size="small" type="number" label="最多精力目标数" value={config.maxGoals} onChange={(e) => onChange({ maxGoals: Math.max(0, Math.min(20, Number((e.target as HTMLInputElement).value) || 0)) })} />
        <TextField size="small" type="number" label="历史分析窗口" value={config.analysisWindowDays} onChange={(e) => onChange({ analysisWindowDays: Math.max(7, Math.min(90, Number((e.target as HTMLInputElement).value) || 30)) })} />
      </Stack>
      <TextField size="small" label="精力目标路径（可选）" value={config.goalPath} placeholder="留空 = 所有有精力记录的目标" onChange={(e) => onChange({ goalPath: (e.target as HTMLInputElement).value })} />
      <div>
        <Typography variant="body2" color="text.secondary">默认当前场景</Typography>
        <SimpleSelect
          value={config.currentContext}
          options={[
            { value: 'any', label: '任意' },
            { value: 'work', label: '工作' },
            { value: 'home', label: '家' },
            { value: 'commute', label: '通勤' },
            { value: 'out', label: '外出' },
          ]}
          onChange={(value) => onChange({ currentContext: value as any })}
          fullWidth
        />
      </div>
      <FormControlLabel control={<Checkbox checked={config.showTimeline !== false} onChange={(e) => onChange({ showTimeline: (e.target as HTMLInputElement).checked })} />} label="显示精力地图" />
      <Typography variant="body2" color="text.secondary">
        推荐原因不占主界面，只在任务悬浮提示中显示；任务从 Energy 启动后按建议时长倒计时，完成后的 TaskSession 与下一次精力记录可继续积累个人化证据。
      </Typography>
    </Stack>
  );
}
