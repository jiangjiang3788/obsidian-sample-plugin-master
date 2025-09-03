// src/features/settings/ui/InputSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Divider } from '@mui/material';
import { BlockManager } from './BlockManager';
import { ThemeMatrix } from './ThemeMatrix';
import { AppStore } from '@state/AppStore'; // [新增]

// [修改] 组件 props 现在需要接收 appStore
export function InputSettings({ appStore }: { appStore: AppStore }) {
    return (
        <Box>
            {/* [修改] 将 appStore 传递给子组件 */}
            <BlockManager appStore={appStore} />
            <Divider sx={{ my: 4, mx: 'auto', maxWidth: 900 }} />
            <ThemeMatrix appStore={appStore} />
        </Box>
    );
}