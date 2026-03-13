/** @jsxImportSource preact */
import { h } from 'preact';
import { Stack, Typography } from '@mui/material';
import type { ViewEditorProps } from './registry';
import { TASK_EXECUTION_VIEW_DEFAULT_CONFIG } from '@core/public';

export { TASK_EXECUTION_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/public';

export function TaskExecutionViewEditor(_props: ViewEditorProps) {
  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        任务执行视图：按主题两级分组展示带 🔁 的未完成任务。
      </Typography>
      <Typography variant="body2" color="text.secondary">
        左键记录一次，右键查看当前时间范围内的完成记录，并可跳转到原位置。
      </Typography>
    </Stack>
  );
}
