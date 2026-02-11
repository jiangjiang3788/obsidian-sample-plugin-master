// src/features/settings/ui/GeneralSettings.tsx
/**
 * GeneralSettings - 通用设置组件
 * 
 * ⚠️ P0 止血改造：
 * - 禁止直接调用 appStore.updateFloatingTimerEnabled
 * - 必须通过 useCases.settings.setFloatingTimerEnabled
 */
/** @jsxImportSource preact */
import { h } from 'preact';
import { useUseCases, useSelector } from '@/app/public';
import { Box, Typography, Stack, FormControlLabel, Checkbox } from '@mui/material';
import { selectFloatingTimerEnabled } from '@/app/store/selectors';

/**
 * 通用设置组件
 * 
 * ⚠️ P0 止血：禁止直接调用 appStore.updateFloatingTimerEnabled
 * 必须通过 useCases.settings.setFloatingTimerEnabled
 */
export function GeneralSettings() {
    // 使用细粒度 selector 订阅设置状态
    const floatingTimerEnabled = useSelector(selectFloatingTimerEnabled);
    
    // P0: 获取 UseCases
    const useCases = useUseCases();

    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
            <Stack spacing={2}>
                <Typography variant="h6">模块开关</Typography>
                
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={floatingTimerEnabled}
                            // P0: 通过 UseCase 更新设置，而非直接调用 appStore
                            onChange={(e) => useCases.settings.setFloatingTimerEnabled((e.target as HTMLInputElement).checked)}
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
