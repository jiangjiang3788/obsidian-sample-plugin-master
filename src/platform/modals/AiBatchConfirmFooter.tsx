// src/platform/modals/AiBatchConfirmFooter.tsx
/** @jsxImportSource preact */
import { h } from 'preact';

import { Box, Button } from '@shared/public';

export interface AiBatchConfirmFooterProps {
  saved: boolean;
  skipped: boolean;
  onSkip: () => void;
  onSave: () => void;
  onComplete: () => void;
}

export function AiBatchConfirmFooter({ saved, skipped, onSkip, onSave, onComplete }: AiBatchConfirmFooterProps) {
  return (
    <Box
      sx={{
        p: 2,
        borderTop: '1px solid var(--background-modifier-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Button variant="text" color="inherit" onClick={onSkip} disabled={saved || skipped}>
        跳过此条
      </Button>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" onClick={onSave} disabled={saved}>
          {saved ? '已保存' : '保存此条'}
        </Button>
        <Button variant="outlined" onClick={onComplete}>
          完成
        </Button>
      </Box>
    </Box>
  );
}
