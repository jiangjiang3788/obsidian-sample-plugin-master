// src/platform/modals/AiBatchConfirmRecordHeader.tsx
/** @jsxImportSource preact */
import { h } from 'preact';

import { Box, Chip, ModalHeader, Typography } from '@shared/public';

import type { AiBatchConfirmRecordItem } from './AiBatchConfirmModel';
import { shortDisplay } from './AiBatchConfirmModel';

export interface AiBatchConfirmRecordHeaderProps {
  title: string;
  currentIndex: number;
  record: AiBatchConfirmRecordItem;
  onClose: () => void;
}

export function AiBatchConfirmRecordHeader({ title, currentIndex, record, onClose }: AiBatchConfirmRecordHeaderProps) {
  return (
    <ModalHeader
      padding={2}
      left={
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title} · 编辑第 {currentIndex + 1} 条记录
          </Typography>
          {record.saved && <Chip label="已保存" color="success" size="small" sx={{ ml: 1 }} />}
          {record.skipped && <Chip label="已跳过" color="default" size="small" sx={{ ml: 1 }} />}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
            <Chip size="small" variant="outlined" label={`目标：${shortDisplay(record.goalLabel, '未匹配')}`} />
            <Chip size="small" variant="outlined" label={`预设：${shortDisplay(record.presetLabel, 'CoreBlock 默认')}`} />
            <Chip size="small" variant="outlined" label={`主题：${shortDisplay(record.themePath, '未指定')}`} />
          </Box>
        </Box>
      }
      onClose={onClose}
    />
  );
}
