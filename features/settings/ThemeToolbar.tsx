/** @jsxImportSource preact */
import { h } from 'preact';
import {
    Box,
    Button,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';

interface ThemeToolbarProps {
  mode: 'view' | 'edit';
  onToggleEditMode: () => void;
}

export function ThemeToolbar({
    mode,
    onToggleEditMode
}: ThemeToolbarProps) {
    const isEditMode = mode === 'edit';

    return (
        // @ts-ignore - MUI与Preact类型兼容性问题
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            {/* @ts-ignore - MUI与Preact类型兼容性问题 */}
            <Button
                variant="outlined"
                onClick={onToggleEditMode}
                startIcon={isEditMode ? <VisibilityIcon /> : <EditIcon /> as any}
            >
                {isEditMode ? '退出编辑模式' : '进入编辑模式'}
            </Button>
        </Box>
    );
}
