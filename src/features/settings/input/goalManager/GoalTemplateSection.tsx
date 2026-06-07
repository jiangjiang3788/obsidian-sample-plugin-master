/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Typography } from '@shared/public';
import { GoalTemplateMatrix } from '../../goalTemplates';

/**
 * 预设表：行是目标，列是 Block，单元格是目标 × Block 的多个预设。
 * 这里不再提供独立“预设模板页”，也不再使用卡片式单元格，避免格子套格子。
 */
export function GoalTemplateSection() {
  return (
    <Box sx={{ display: 'grid', gap: 1.25 }}>
      <Box>
        <Typography sx={{ fontWeight: 800 }}>目标 × Block 预设表</Typography>
        <Typography variant="body2" color="text.secondary">
          行是目标，列是 Block；单元格里显示这个组合的预设。点击单元格即可管理多个预设。
        </Typography>
      </Box>
      <GoalTemplateMatrix />
    </Box>
  );
}
