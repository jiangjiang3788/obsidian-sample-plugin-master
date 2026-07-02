// src/platform/obsidian/modals/AiBatchConfirmSidebar.tsx
/** @jsxImportSource preact */
import { h } from 'preact';

import {
  Box,
  Button,
  CheckCircleIcon,
  DeleteIcon,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  RadioButtonUncheckedIcon,
  Typography,
} from '@shared/ui/public';

import type { AiBatchConfirmRecordItem } from './AiBatchConfirmModel';
import { shortDisplay } from './AiBatchConfirmModel';

export interface AiBatchConfirmSidebarProps {
  records: AiBatchConfirmRecordItem[];
  blocks: any[];
  currentIndex: number;
  savedCount: number;
  pendingCount: number;
  onSelect: (index: number) => void;
  onSaveAll: () => void;
}

export function AiBatchConfirmSidebar({
  records,
  blocks,
  currentIndex,
  savedCount,
  pendingCount,
  onSelect,
  onSaveAll,
}: AiBatchConfirmSidebarProps) {
  return (
    <Box
      sx={{
        width: '200px',
        borderRight: '1px solid var(--background-modifier-border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      <Box sx={{ p: 1.5, borderBottom: '1px solid var(--background-modifier-border)' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          AI 识别结果
        </Typography>
        <Typography variant="caption" color="text.secondary">
          共 {records.length} 条 · 已保存 {savedCount}
        </Typography>
      </Box>
      <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
        {records.map((record, index) => {
          const block = blocks.find((entry) => entry.id === record.blockId);
          const isActive = index === currentIndex;
          return (
            <ListItemButton
              key={record.id}
              selected={isActive}
              onClick={() => onSelect(index)}
              sx={{ py: 1, opacity: record.skipped ? 0.5 : 1, bgcolor: isActive ? 'action.selected' : 'transparent' }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {record.saved ? (
                  <CheckCircleIcon color="success" fontSize="small" />
                ) : record.skipped ? (
                  <DeleteIcon color="disabled" fontSize="small" />
                ) : (
                  <RadioButtonUncheckedIcon color="action" fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" noWrap sx={{ fontWeight: isActive ? 600 : 400 }}>
                    {block?.name || '未知类型'}
                  </Typography>
                }
                secondary={
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" noWrap color="text.secondary" sx={{ display: 'block' }}>
                      {shortDisplay(record.goalLabel, '未匹配目标', 18)} · {shortDisplay(record.presetLabel, '默认预设', 18)}
                    </Typography>
                    <Typography variant="caption" noWrap color="text.secondary" sx={{ display: 'block' }}>
                      {record.cmd.fieldValues?.内容?.slice(0, 20) || record.cmd.rawText?.slice(0, 20) || `记录 ${index + 1}`}
                    </Typography>
                  </Box>
                }
              />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ p: 1.5, borderTop: '1px solid var(--background-modifier-border)' }}>
        <Button fullWidth variant="outlined" size="small" onClick={onSaveAll} disabled={pendingCount === 0}>
          保存全部 ({pendingCount})
        </Button>
      </Box>
    </Box>
  );
}
