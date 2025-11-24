// src/features/dashboard/settings/ModuleEditors/BlockViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Typography } from '@mui/material';
import { BLOCK_VIEW_DEFAULT_CONFIG } from '@core/config/viewConfigs';

// 重新导出以保持兼容性
export { BLOCK_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/config/viewConfigs';

export function BlockViewEditor() {
  return (
    <Typography variant="body1" color="text.secondary">
      块视图（BlockView）没有专属配置项。它的行为主要由上方的 **显示字段** 和 **分组字段** 控制。
    </Typography>
  );
}
