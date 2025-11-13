/**
 * 模式切换组件
 * 用于在主题模式和Block模式之间切换
 */
/** @jsxImportSource preact */
import { h } from 'preact';
import { 
  Box, 
  Button, 
  Typography, 
  Chip,
  ButtonGroup
} from '@mui/material';
import type { ThemeMatrixMode, SelectionStats } from '../hooks/useThemeMatrixSelection';

export interface ModeToggleProps {
  /** 当前模式 */
  mode: ThemeMatrixMode;
  /** 模式切换回调 */
  onChange: (mode: ThemeMatrixMode) => void;
  /** 选择统计信息 */
  selectionStats: SelectionStats;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 模式切换组件
 */
export function ModeToggle({ 
  mode, 
  onChange, 
  selectionStats, 
  disabled = false 
}: ModeToggleProps) {

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
      {/* 模式切换按钮组 */}
      <ButtonGroup variant="outlined" size="small" disabled={disabled}>
        <Button
          variant={mode === 'theme' ? 'contained' : 'outlined'}
          onClick={() => onChange('theme')}
          sx={{ minWidth: 100 }}
        >
          🎨 主题模式
        </Button>
        <Button
          variant={mode === 'block' ? 'contained' : 'outlined'}
          onClick={() => onChange('block')}
          sx={{ minWidth: 100 }}
        >
          📦 Block模式
        </Button>
      </ButtonGroup>

      {/* 选择统计信息 */}
      {selectionStats.total > 0 && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {mode === 'theme' && selectionStats.themes > 0 && (
            <Chip
              size="small"
              label={`已选择 ${selectionStats.themes} 个主题`}
              color="primary"
              variant="outlined"
            />
          )}
          {mode === 'block' && selectionStats.blocks > 0 && (
            <Chip
              size="small"
              label={`已选择 ${selectionStats.blocks} 个Block配置`}
              color="secondary"
              variant="outlined"
            />
          )}
        </Box>
      )}

      {/* 模式说明 */}
      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
        {mode === 'theme' ? (
          '通过状态列选择主题，支持批量激活/归档、设置图标等操作'
        ) : (
          '通过Block列头选择整列，支持批量设置继承/覆盖/禁用状态'
        )}
      </Typography>
    </Box>
  );
}
