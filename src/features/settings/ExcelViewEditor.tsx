// src/features/dashboard/settings/ModuleEditors/ExcelViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Typography } from '@mui/material';
import { EXCEL_VIEW_DEFAULT_CONFIG } from '@core/config/viewConfigs';

// 重新导出以保持兼容性
export { EXCEL_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/config/viewConfigs';

export function ExcelViewEditor() {
  return (
    <Typography variant="body1" color="text.secondary">
      数据表格（ExcelView）没有专属配置项。它会自动展示所有 **显示字段** 中指定的列。
    </Typography>
  );
}
