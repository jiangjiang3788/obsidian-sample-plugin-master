// src/features/settings/ui/InputSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Alert } from '@shared/public';

// 记录类型、目标、主题、指标已统一进入“数据管理”。
export function InputSettings() {
    return (
        <Box className="think-settings-page">
            <Alert severity="info">
                快速输入页只负责使用；记录类型、目标、主题和指标请在“数据管理”维护。
            </Alert>
        </Box>
    );
}
