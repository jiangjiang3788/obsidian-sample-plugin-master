// src/features/dashboard/settings/ModuleEditors/ExcelViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Typography } from '@mui/material';

export const DEFAULT_CONFIG = {
  view: 'ExcelView' as const,
  title: '数据表格',
  collapsed: false,
  fields: [],
};

export function ExcelViewEditor() {
  return (
    <Typography variant="body1" color="text.secondary">
      数据表格（ExcelView）没有专属配置项。它会自动展示所有 **显示字段** 中指定的列。
    </Typography>
  );
}