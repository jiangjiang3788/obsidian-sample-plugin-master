/** @jsxImportSource preact */
import { h } from 'preact';
import {
    Paper,
    Stack,
    Button,
    FormControlLabel,
    Switch,
    Box
} from '@mui/material';
import type { ThemeToolbarProps } from '../types';
import { ModeToggle } from './ModeToggle';

export function ThemeToolbar({
    mode,
    onModeChange,
    selectionStats,
    showArchived,
    onSelectAll,
    onBatchOperation,
    onClearSelection,
    onToggleArchived
}: ThemeToolbarProps) {
    // 判断是否全选状态
    const isAllSelected = mode === 'theme' 
        ? selectionStats.themes > 0 // 在主题模式下，有选中的主题就算全选（因为我们不知道总数）
        : selectionStats.blocks > 0; // 在Block模式下，有选中的Block就算全选

    return (
        <div>
            {/* 模式切换组件 */}
            <ModeToggle
                mode={mode}
                onChange={onModeChange}
                selectionStats={selectionStats}
            />
            
            {/* 工具栏 */}
            {/* @ts-ignore */}
            <Paper sx={{ p: 2, mb: 2 }}>
                {/* @ts-ignore */}
                <Stack direction="row" spacing={2} alignItems="center">
                    <Button 
                        variant="outlined" 
                        onClick={onSelectAll}
                    >
                        {isAllSelected ? '✓ 取消全选' : '☐ 全选'}
                    </Button>
                    
                    {selectionStats.total > 0 && (
                        <div style={{ display: 'contents' }}>
                            {/* @ts-ignore */}
                            <Button
                                variant="outlined" 
                                onClick={onBatchOperation}
                            >
                                批量操作 ({selectionStats.total})
                            </Button>
                            {/* @ts-ignore */}
                            <Button 
                                variant="outlined" 
                                color="error"
                                onClick={onClearSelection}
                            >
                                清除选择
                            </Button>
                        </div>
                    )}
                    
                    {/* @ts-ignore */}
                    <Box sx={{ flex: 1 }} />
                    
                    {/* @ts-ignore */}
                    <FormControlLabel
                        control={<Switch checked={showArchived} onChange={(e) => onToggleArchived((e.target as any).checked)} />}
                        label="显示归档主题"
                    />
                </Stack>
            </Paper>
        </div>
    );
}
