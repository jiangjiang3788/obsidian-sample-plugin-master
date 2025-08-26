// src/core/settings/ui/InputSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Divider } from '@mui/material';
import { BlockManager } from './BlockManager';
import { ThemeMatrix } from './ThemeMatrix';

export function InputSettings() {
    return (
        <Box>
            <BlockManager />
            <Divider sx={{ my: 4, mx: 'auto', maxWidth: 900 }} />
            <ThemeMatrix />
        </Box>
    );
}