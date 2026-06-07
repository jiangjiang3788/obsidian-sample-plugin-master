// src/features/settings/ui/InputSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Alert, Typography } from '@shared/public';
import { BlockManager } from '@features/settings/input/BlockManager';

// P1 数据管理收敛：快速输入页只保留固定 Block / 字段层配置。
// 目标、记录预设、主题元数据已迁移到“数据管理”页。
export function InputSettings() {
    return (
        <Box sx={{ display: 'grid', gap: 2 }}>
            <Alert severity="info">
                快速输入现在只负责“选择目标 → 选择固定 Block → 填写用户字段”。目标管理、记录预设和主题图标请到“数据管理”页维护。
            </Alert>
            <Box sx={{ mx: 'auto', maxWidth: 900 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Block 是固定动作类型：任务、计划、总结、打卡、阻碍项、里程碑、思考、事件。主题不再决定模板。
                </Typography>
            </Box>
            <BlockManager />
        </Box>
    );
}
