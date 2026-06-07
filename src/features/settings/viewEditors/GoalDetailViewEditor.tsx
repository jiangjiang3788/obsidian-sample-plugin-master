/** DEPRECATED: GoalOverview / GoalDetail are legacy compatibility files. New views must use ProgressView / StatisticsView. */
/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, TextField, Typography } from '@shared/public';
import type { ViewEditorProps } from './registry';

export const DEFAULT_CONFIG = {
  goalDetail: {
    goalPath: '',
  },
};

export function GoalDetailViewEditor({ value, onChange }: ViewEditorProps) {
  const config = value?.goalDetail || DEFAULT_CONFIG.goalDetail;
  const patch = (next: Partial<typeof DEFAULT_CONFIG.goalDetail>) => onChange({ goalDetail: { ...config, ...next } });
  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <Typography variant="body2" color="text.secondary">
        目标详情视图固定展示一个目标，适合放在单目标仪表盘中。
      </Typography>
      <TextField
        label="目标路径"
        value={config.goalPath || ''}
        onChange={(event: any) => patch({ goalPath: event.target.value })}
        size="small"
        fullWidth
        placeholder="例如：产品化/插件/目标中心"
      />
    </Box>
  );
}
