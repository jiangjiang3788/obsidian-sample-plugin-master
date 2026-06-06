// src/features/settings/ui/InputSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Divider } from '@shared/public';
import { BlockManager } from '@features/settings/input/BlockManager';
import { ThemeMatrix } from '@features/settings/theme/ThemeMatrix';
import { GoalManager } from '@features/settings/input/GoalManager';

// [修改] 组件不再需要 props，依赖统一通过 Context 获取
export function InputSettings() {
    return (
        <Box>
            <GoalManager />
            <Divider sx={{ my: 4, mx: 'auto', maxWidth: 900 }} />
            {/* BlockManager 通过 useUseCases() 获取依赖 */}
            <BlockManager />
            <Divider sx={{ my: 4, mx: 'auto', maxWidth: 900 }} />
            {/* ThemeMatrix 通过 useSelector() / useUseCases() 获取依赖 */}
            <ThemeMatrix />
        </Box>
    );
}
