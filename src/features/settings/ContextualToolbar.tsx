/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Typography, Button, Stack, Divider } from '@mui/material';
import { type EditorState } from './useThemeMatrixEditor';
import type { BatchOperation } from './useBatchOperations';

interface ContextualToolbarProps {
  editorState: EditorState;
  onAction: (action: BatchOperation) => void;
  onClearSelection: () => void;
}

export function ContextualToolbar({ editorState, onAction, onClearSelection }: ContextualToolbarProps) {
  const { selectionType, selectedThemes, selectedCells } = editorState;

  if (selectionType === 'none') {
    return null;
  }

  const count = selectionType === 'theme' ? selectedThemes.size : selectedCells.size;
  const typeLabel = selectionType === 'theme' ? '个主题' : '个配置';

  return (
    // @ts-ignore
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: 'background.paper',
        padding: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        mb: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* @ts-ignore */}
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          已选择 {count} {typeLabel}
        </Typography>
        <Divider orientation="vertical" flexItem />
        {selectionType === 'theme' && (
          // @ts-ignore
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => onAction('activate')}>激活</Button>
            <Button size="small" onClick={() => onAction('archive')}>归档</Button>
            <Button size="small" onClick={() => onAction('setIcon')}>设置图标</Button>
            <Button size="small" color="error" onClick={() => onAction('delete')}>删除</Button>
          </Stack>
        )}
        {selectionType === 'block' && (
          // @ts-ignore
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => onAction('setInherit')}>设为继承</Button>
            <Button size="small" onClick={() => onAction('setOverride')}>设为覆盖</Button>
            <Button size="small" onClick={() => onAction('setDisabled')}>设为禁用</Button>
          </Stack>
        )}
      </Stack>
      <Button size="small" variant="outlined" onClick={onClearSelection}>
        取消选择
      </Button>
    </Box>
  );
}
