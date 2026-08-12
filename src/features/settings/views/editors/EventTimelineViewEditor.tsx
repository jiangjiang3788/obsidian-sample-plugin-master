// src/features/settings/EventTimelineViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { Button, SimpleSelect, Stack, TextField } from '@shared/ui/public';
import { EVENT_TIMELINE_VIEW_DEFAULT_CONFIG } from '@core/view/public';
import { FULL_DATA_FIELD_KEY, CONTENT_FIELD_KEY, getFieldCategoryLabel, getFieldLabel } from '@core/fields/public';
import type { EventTimelineViewConfig } from '@core/view/public';
import type { ViewEditorProps } from './ViewEditorProps';
import { ConfigFieldRow, ConfigSection, ViewEditorShell } from './settingsEditorUi';

// 重新导出以保持兼容性
export { EVENT_TIMELINE_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/view/public';

function uniqueFields(fields: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const field of fields) {
        if (!field || seen.has(field)) continue;
        seen.add(field);
        result.push(field);
    }
    return result;
}

export function EventTimelineViewEditor({ value = {}, onChange, fieldOptions = [] }: ViewEditorProps) {
    const config: EventTimelineViewConfig = {
        ...EVENT_TIMELINE_VIEW_DEFAULT_CONFIG,
        ...(value || {}),
    };

    const selectableFields = useMemo(() => uniqueFields([
        CONTENT_FIELD_KEY,
        FULL_DATA_FIELD_KEY,
        'title',
        'date',
        'startTime',
        ...fieldOptions,
    ]), [fieldOptions]);

    const fieldSelectOptions = useMemo(() => selectableFields.map(field => ({
        value: field,
        label: getFieldLabel(field),
        group: getFieldCategoryLabel(field),
    })), [selectableFields]);

    const patch = (partial: Partial<EventTimelineViewConfig>) => onChange(partial as Record<string, any>);

    return (
        <ViewEditorShell
            title="事件时间线视图"
            description={(
                <span>
                    事件时间线视图按时间顺序纵向展示事件，采用三栏布局：<br />
                    <strong>[左侧日期] - [中间时间线] - [右侧内容卡片]</strong><br /><br />
                    • <strong>任务内容语义</strong>：推荐使用 <strong>内容</strong> 字段显示干净正文；需要排查原始 Markdown 时再切换到 <strong>完整数据</strong>。<br />
                    • <strong>视觉保持</strong>：任务仍以 TaskRow 展示，Block 仍使用 BlockItem / Markdown 渲染。
                </span>
            )}
        >
            <ConfigSection title="字段映射">
                <Stack spacing={1.25}>
                    <ConfigFieldRow label="时间字段">
                        <SimpleSelect
                            value={config.timeField || 'date'}
                            options={fieldSelectOptions}
                            onChange={(field) => patch({ timeField: field })}
                            sx={{ minWidth: '220px' }}
                        />
                    </ConfigFieldRow>
                    <ConfigFieldRow label="标题字段">
                        <SimpleSelect
                            value={config.titleField || 'title'}
                            options={fieldSelectOptions}
                            onChange={(field) => patch({ titleField: field })}
                            sx={{ minWidth: '220px' }}
                        />
                    </ConfigFieldRow>
                    <ConfigFieldRow label="内容字段">
                        <SimpleSelect
                            value={config.contentField || CONTENT_FIELD_KEY}
                            options={fieldSelectOptions}
                            onChange={(field) => patch({ contentField: field })}
                            sx={{ minWidth: '220px' }}
                        />
                    </ConfigFieldRow>
                    <ConfigFieldRow label="最大长度" description="0 表示不截断">
                        <TextField
                            type="number"
                            size="small"
                            value={config.maxContentLength ?? 160}
                            onChange={(event: Event) => patch({ maxContentLength: Number((event.target as HTMLInputElement).value) || 0 })}
                            inputProps={{ min: 0, max: 2000 }}
                            sx={{ width: '140px' }}
                        />
                    </ConfigFieldRow>
                </Stack>

                <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => patch({ contentField: CONTENT_FIELD_KEY, titleField: 'title', timeField: 'date', maxContentLength: 160 })}
                    >
                        使用推荐字段
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => patch({ contentField: FULL_DATA_FIELD_KEY })}
                    >
                        内容改为完整数据调试
                    </Button>
                </Stack>
            </ConfigSection>
        </ViewEditorShell>
    );
}
