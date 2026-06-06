/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, TextField, Typography } from '@shared/public';
import type { ViewEditorProps } from './registry';

export const DEFAULT_CONFIG = {
  goalOverview: {
    goalPath: '',
    limit: 20,
  },
};

export function GoalOverviewViewEditor({ value, onChange }: ViewEditorProps) {
  const config = value?.goalOverview || DEFAULT_CONFIG.goalOverview;
  const patch = (next: Partial<typeof DEFAULT_CONFIG.goalOverview>) => onChange({ goalOverview: { ...config, ...next } });
  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <Typography variant="body2" color="text.secondary">
        目标总览视图会按目标聚合任务、计划、总结、打卡、事件、阻碍项和里程碑。目标为空时显示最近活跃目标。
      </Typography>
      <TextField
        label="固定目标路径（可选）"
        value={config.goalPath || ''}
        onChange={(event: any) => patch({ goalPath: event.target.value })}
        size="small"
        fullWidth
        placeholder="例如：产品化/插件/目标中心"
      />
      <TextField
        label="最多显示目标数"
        type="number"
        value={config.limit || 20}
        onChange={(event: any) => patch({ limit: Number(event.target.value) || 20 })}
        size="small"
        fullWidth
      />
    </Box>
  );
}
