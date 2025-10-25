// src/core/settings/ui/components/TemplateVariableCopier.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { Notice } from 'obsidian';
import type { BlockTemplate } from '@core/domain/schema';
import { SimpleSelect } from '@shared/ui/SimpleSelect';
import { Box } from '@mui/material';

interface Props {
    block: BlockTemplate;
}

export function TemplateVariableCopier({ block }: Props) {
    const variableOptions = useMemo(() => {
        const options = [
            { value: '{{block}}', label: 'block' },
            { value: '{{theme}}', label: 'theme' },
            { value: '{{icon}}', label: 'icon' },
            { value: '{{moment:YYYY-MM-DD}}', label: 'moment:YYYY-MM-DD' },
        ];

        block.fields.forEach(field => {
            const fieldKey = field.key || 'untitled';

            // 基础变量，所有字段都提供
            options.push({ value: `{{${fieldKey}}}`, label: `${fieldKey}` });
            
            // [修改] 仅为复杂字段提供 .value 选项
            if (field.type === 'select' || field.type === 'radio') {
                options.push({ value: `{{${fieldKey}.value}}`, label: `${fieldKey}.value` });
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
                placeholder="-- 复制变量 --"
            />
        </Box>
    );
}