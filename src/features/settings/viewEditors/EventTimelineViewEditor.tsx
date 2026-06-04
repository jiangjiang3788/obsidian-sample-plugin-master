// src/features/settings/EventTimelineViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { Box, Button, SimpleSelect, Stack, TextField, Typography } from '@shared/public';
import {
    EVENT_TIMELINE_VIEW_DEFAULT_CONFIG,
    FULL_DATA_FIELD_KEY,
    CONTENT_FIELD_KEY,
    getFieldCategoryLabel,
    getFieldLabel,
} from '@core/public';
import type { EventTimelineViewConfig } from '@core/public';
import type { ViewEditorProps } from './registry';

// 重新导出以保持兼容性
export { EVENT_TIMELINE_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/public';

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
        <Box class="event-timeline-editor-description" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div>
                <div class="statistics-section-title">事件时间线视图</div>
                <div class="statistics-section-description">
                    事件时间线视图按时间顺序纵向展示事件，采用三栏布局：
                    <br />
                    <strong>[左侧日期] - [中间时间线] - [右侧内容卡片]</strong>
                    <br /><br />
                    • <strong>任务内容语义</strong>：推荐使用 <strong>内容</strong> 字段显示干净正文；需要排查原始 Markdown 时再切换到 <strong>完整数据</strong>。
                    <br />
                    • <strong>视觉保持</strong>：任务仍以 TaskRow 展示，Block 仍使用 BlockItem / Markdown 渲染。
                </div>
            </div>

            <Box sx={{ p: 1.5, border: '1px solid var(--background-modifier-border)', borderRadius: '10px' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>字段映射</Typography>
                <Stack spacing={1.25}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography sx={{ width: 92, flexShrink: 0, fontWeight: 600 }}>时间字段</Typography>
                        <SimpleSelect
                            value={config.timeField || 'date'}
                            options={fieldSelectOptions}
                            onChange={(field) => patch({ timeField: field })}
                            sx={{ minWidth: '220px' }}
                        />
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography sx={{ width: 92, flexShrink: 0, fontWeight: 600 }}>标题字段</Typography>
                        <SimpleSelect
                            value={config.titleField || 'title'}
                            options={fieldSelectOptions}
                            onChange={(field) => patch({ titleField: field })}
                            sx={{ minWidth: '220px' }}
                        />
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography sx={{ width: 92, flexShrink: 0, fontWeight: 600 }}>内容字段</Typography>
                        <SimpleSelect
                            value={config.contentField || CONTENT_FIELD_KEY}
                            options={fieldSelectOptions}
                            onChange={(field) => patch({ contentField: field })}
                            sx={{ minWidth: '220px' }}
                        />
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography sx={{ width: 92, flexShrink: 0, fontWeight: 600 }}>最大长度</Typography>
                        <TextField
                            type="number"
                            size="small"
                            value={config.maxContentLength ?? 160}
                            onChange={(event: any) => patch({ maxContentLength: Number((event.target as HTMLInputElement).value) || 0 })}
                            inputProps={{ min: 0, max: 2000 }}
                            sx={{ width: '140px' }}
                        />
                        <Typography variant="caption" color="text.secondary">0 表示不截断</Typography>
                    </Stack>
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
            </Box>
        </Box>
    );
}
