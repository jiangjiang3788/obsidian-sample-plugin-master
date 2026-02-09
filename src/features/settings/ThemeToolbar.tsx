/** @jsxImportSource preact */
import { h } from 'preact';
import {
    Box,
    Button,
} from '@shared/public';
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
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
                variant="outlined"
                onClick={onToggleEditMode}
                startIcon={isEditMode ? <VisibilityIcon /> : <EditIcon />}
            >
                {isEditMode ? '退出编辑模式' : '进入编辑模式'}
            </Button>
        </Box>
    );
}
