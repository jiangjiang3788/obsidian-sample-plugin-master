// src/features/dashboard/settings/ModuleEditors/StatisticsViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Stack, Typography, TextField } from '@mui/material';
import type { ViewEditorProps } from './registry';
import { KeyValueEditor } from '@shared/components/form/KeyValueEditor';
import { ListEditor } from '@shared/components/form/ListEditor';

// 视图的默认配置
export const DEFAULT_CONFIG = {
    categoryOrder: ["总结", "计划" , "事件","感受","思考"],
    categoryColors: {
        "总结": "#FFD6E0",
        "计划": "#B5EAD7",
        "事件": "#FFFACD",
        "感受": "#FFDAC1",
        "思考": "#C7CEEA"
    },
};

export function StatisticsViewEditor({ value, onChange }: ViewEditorProps) {
    const config = { ...DEFAULT_CONFIG, ...value };

    return (
        <Stack spacing={2.5}>
            <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>分类顺序</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    定义在图表中显示的分类及其前后顺序。这里填写 `categoryKey` 的基础部分。
                </Typography>
                <ListEditor 
                    value={config.categoryOrder}
                    onChange={newOrder => onChange({ categoryOrder: newOrder })}
                    placeholder="例如: 总结"
                />
            </Stack>
            <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>分类颜色</Typography>
                 <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    为每个分类指定一个颜色。
                </Typography>
                <KeyValueEditor
                    value={config.categoryColors}
                    onChange={newColors => onChange({ categoryColors: newColors })}
                    keyLabel="分类名称"
                    valueLabel="颜色代码"
                />
            </Stack>
        </Stack>
    );
}