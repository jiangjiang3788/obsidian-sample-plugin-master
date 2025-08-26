// src/features/dashboard/settings/ModuleEditors/BlockViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Typography } from '@mui/material';

export const DEFAULT_CONFIG = {
  view: 'BlockView' as const,
  title: '块视图',
  collapsed: false,
  fields: [],
  group: 'categoryKey',
};

export function BlockViewEditor() {
  return (
    <Typography variant="body1" color="text.secondary">
      块视图（BlockView）没有专属配置项。它的行为主要由上方的 **显示字段** 和 **分组字段** 控制。
    </Typography>
  );
}