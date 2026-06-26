// src/core/settings/ui/components/TemplateVariableCopier.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { useUiPort } from '@/app/public';
import type { BlockTemplate } from '@core/public';
import { SimpleSelect } from '@shared/public';
import { Box } from '@shared/public';

interface Props {
    block: BlockTemplate;
}

export function TemplateVariableCopier({ block }: Props) {
    const ui = useUiPort();
    const variableOptions = useMemo(() => {
        const options = [
            { value: '{{block}}', label: 'block' },
            { value: '{{theme}}', label: 'theme' },
            { value: '{{icon}}', label: 'icon' },
            { value: '{{moment:YYYY-MM-DD}}', label: 'moment:YYYY-MM-DD' },
            { value: '{{templateId}}', label: 'templateId' },
            { value: '{{templateSourceType}}', label: 'templateSourceType' },
            { value: '模板ID:: {{templateId}}', label: '模板ID:: {{templateId}}' },
            { value: '模板来源:: {{templateSourceType}}', label: '模板来源:: {{templateSourceType}}' },
        ];

        (block?.fields || []).forEach(field => {
            const fieldKey = field.key || 'untitled';
            const fieldType = field.type || 'text';
            // 基础变量，所有字段都提供。
            options.push({ value: `{{${fieldKey}}}`, label: `${fieldKey}` });

            // 选项、路径、标签、评分字段常返回 { value, label }，给模板作者明确入口。
            if ([
                'select',
                'radio',
                'singleSelect',
                'multiSelect',
                'path',
                'multiPath',
                'tag',
                'multiTag',
                'rating',
            ].includes(fieldType)) {
                options.push({ value: `{{${fieldKey}.value}}`, label: `${fieldKey}.value` });
                options.push({ value: `{{${fieldKey}.label}}`, label: `${fieldKey}.label` });
            }

            if (fieldType === 'image' || fieldType === 'multiImage') {
                options.push({ value: `{{${fieldKey}.src}}`, label: `${fieldKey}.src` });
            }

            const markdownKey = field.key;
            if (markdownKey) {
                options.push({ value: `${markdownKey}:: {{${fieldKey}}}`, label: `${markdownKey}:: {{${fieldKey}}}` });
            }
        });

        return options;
    }, [block]);

    const handleCopy = (variable: string) => {
        if (!variable) return;
        navigator.clipboard.writeText(variable);
        ui.notice(`已复制: ${variable}`);
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
