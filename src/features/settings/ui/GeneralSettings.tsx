// src/features/settings/ui/GeneralSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { Box, Typography, Stack, FormControlLabel, Checkbox } from '@mui/material';

// 组件 props 需要接收 appStore 实例，以便进行状态更新
export function GeneralSettings({ appStore }: { appStore: AppStore }) {
    // 从 store 中订阅需要的设置状态
    const floatingTimerEnabled = useStore(state => state.settings.floatingTimerEnabled);

    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
            <Stack spacing={2}>
                <Typography variant="h6">模块开关</Typography>
                
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={floatingTimerEnabled}
                            // 当开关状态改变时，调用 appStore 中对应的方法来更新设置
                            onChange={(e) => appStore.updateFloatingTimerEnabled(e.target.checked)}
                        />
                    }
                    label="启用悬浮计时器"
                />
                <Typography variant="body2" color="text.secondary" sx={{ pl: 4, mt: -1.5 }}>
                    关闭后，下次启动Obsidian将不再加载悬浮计时器。你也可以通过命令面板临时切换它的可见性。
                </Typography>
            </Stack>
        </Box>
    );
}