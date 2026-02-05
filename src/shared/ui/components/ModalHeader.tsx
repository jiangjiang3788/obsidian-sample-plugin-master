// src/shared/ui/components/ModalHeader.tsx
// @ts-nocheck
/** @jsxImportSource preact */
import { h } from 'preact';
import type { ComponentChildren } from 'preact';

import { Box, IconButton, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * ModalHeader
 *
 * 统一 Modal 顶部“左侧标题/内容 + 右侧关闭按钮”的样式结构，减少重复样板。
 */
export function ModalHeader({
  left,
  onClose,
  right,
  padding = 1.5,
  borderBottom = true,
}: {
  left: ComponentChildren;
  onClose?: () => void;
  /** 右侧自定义区域；不传则默认渲染关闭按钮 */
  right?: ComponentChildren;
  padding?: number;
  borderBottom?: boolean;
}) {
  return (
    <Box
      sx={{
        p: padding,
        ...(borderBottom ? { borderBottom: '1px solid var(--background-modifier-border)' } : {}),
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>{left}</Box>

      {right ??
        (onClose ? (
          <Tooltip title="关闭">
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Tooltip>
        ) : null)}
    </Box>
  );
}

export default ModalHeader;