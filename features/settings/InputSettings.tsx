// src/features/settings/ui/InputSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Divider } from '@mui/material';
import { BlockManager } from './BlockManager';
import { ThemeMatrix } from '@features/settings/ThemeMatrix';
import { AppStore } from '@/app/AppStore';
import { DataStore } from '@/core/services/DataStore';

// [修改] 组件 props 现在需要接收 appStore 和 dataStore
export function InputSettings({ appStore, dataStore }: { appStore: AppStore, dataStore: DataStore }) {
    return (
        <Box>
            {/* [修改] 将 appStore 传递给子组件 */}
            <BlockManager appStore={appStore} />
            <Divider sx={{ my: 4, mx: 'auto', maxWidth: 900 }} />
            <ThemeMatrix appStore={appStore} dataStore={dataStore} />
        </Box>
    );
}
