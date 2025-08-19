// src/core/settings/ui/components/TemplateVariableCopier.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { Notice } from 'obsidian';
import type { BlockTemplate } from '@core/domain/schema';
import { SimpleSelect } from '@shared/ui/SimpleSelect';
import { Box, Typography } from '@mui/material';

interface Props {
    block: BlockTemplate;
}

export function TemplateVariableCopier({ block }: Props) {
    // 生成所有可用变量的列表
    const variableOptions = useMemo(() => {
        const options = [
            { value: '{{block.name}}', label: 'Block 名称' },
            { value: '{{theme.path}}', label: '主题 路径' },
            { value: '{{theme.icon}}', label: '主题 图标' },
            { value: '{{moment:YYYY-MM-DD}}', label: '动态日期 (moment)' },
        ];

        block.fields.forEach(field => {
            options.push({ value: `{{${field.key}}}`, label: `字段: ${field.label}` });
            options.push({ value: `{{${field.key}.value}}`, label: `字段: ${field.label} (.value)` });
            if (field.type === 'select' || field.type === 'radio') {
                options.push({ value: `{{${field.key}.label}}`, label: `字段: ${field.label} (.label)` });
                // 如果有额外值，也加入选项
                const extraKeys = new Set<string>();
                field.options?.forEach(opt => {
                    Object.keys(opt.extraValues || {}).forEach(key => extraKeys.add(key));
                });
                extraKeys.forEach(key => {
                    options.push({ value: `{{${field.key}.${key}}}`, label: `字段: ${field.label} (.${key})` });
                });
            }
        });

        return options;
    }, [block]);

    const handleCopy = (variable: string) => {
        if (!variable) return;
        navigator.clipboard.writeText(variable);
        new Notice(`已复制: ${variable}`);
    };

    return (
        <Box sx={{ maxWidth: 220 }}>
            <SimpleSelect
                value="" // 每次选择后保持为空
                options={variableOptions}
                onChange={handleCopy}
                placeholder="-- 复制可用变量 --"
            />
        </Box>
    );
}