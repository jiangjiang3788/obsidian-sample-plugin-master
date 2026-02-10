// src/features/settings/ui/InputSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Divider } from '@mui/material';
import { BlockManager } from './BlockManager';
import { ThemeMatrix } from '@features/settings/ThemeMatrix';

// [修改] 组件不再需要 props，依赖统一通过 Context 获取
export function InputSettings() {
    return (
        <Box>
            {/* BlockManager 通过 useUseCases() 获取依赖 */}
            <BlockManager />
            <Divider sx={{ my: 4, mx: 'auto', maxWidth: 900 }} />
            {/* ThemeMatrix 通过 useSelector() / useUseCases() 获取依赖 */}
            <ThemeMatrix />
        </Box>
    );
}
