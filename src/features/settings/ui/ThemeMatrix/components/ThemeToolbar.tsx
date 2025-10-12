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
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import type { ThemeToolbarProps } from '../types';

export function ThemeToolbar({
    selectedCount,
    totalCount,
    showArchived,
    onSelectAll,
    onBatchOperation,
    onClearSelection,
    onToggleArchived
}: ThemeToolbarProps) {
    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
                <Button 
                    variant="outlined" 
                    onClick={onSelectAll}
                    startIcon={selectedCount === totalCount ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
                >
                    {selectedCount === totalCount ? '取消全选' : '全选'}
                </Button>
                
                {selectedCount > 0 && (
                    <div style={{ display: 'contents' }}>
                        <Button
                            variant="outlined" 
                            onClick={onBatchOperation}
                        >
                            批量操作 ({selectedCount})
                        </Button>
                        <Button 
                            variant="outlined" 
                            color="error"
                            onClick={onClearSelection}
                        >
                            清除选择
                        </Button>
                    </div>
                )}
                
                <Box sx={{ flex: 1 }} />
                
                <FormControlLabel
                    control={<Switch checked={showArchived} onChange={(e) => onToggleArchived((e.target as any).checked)} />}
                    label="显示归档主题"
                />
            </Stack>
        </Paper>
    );
}
