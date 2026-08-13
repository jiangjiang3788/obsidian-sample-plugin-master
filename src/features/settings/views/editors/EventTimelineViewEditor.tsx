// src/features/settings/EventTimelineViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { SimpleSelect, ThinkButton, ThinkInput } from '@shared/ui/public';
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
        >
            <ConfigSection title="字段映射">
                <div className="think-settings-stack think-settings-stack--tight">
                    <ConfigFieldRow label="时间字段">
                        <SimpleSelect
                            value={config.timeField || 'date'}
                            options={fieldSelectOptions}
                            onChange={(field) => patch({ timeField: field })}
                            fullWidth
                        />
                    </ConfigFieldRow>
                    <ConfigFieldRow label="标题字段">
                        <SimpleSelect
                            value={config.titleField || 'title'}
                            options={fieldSelectOptions}
                            onChange={(field) => patch({ titleField: field })}
                            fullWidth
                        />
                    </ConfigFieldRow>
                    <ConfigFieldRow label="内容字段">
                        <SimpleSelect
                            value={config.contentField || CONTENT_FIELD_KEY}
                            options={fieldSelectOptions}
                            onChange={(field) => patch({ contentField: field })}
                            fullWidth
                        />
                    </ConfigFieldRow>
                    <ConfigFieldRow label="最大长度" description="0 表示不截断">
                        <ThinkInput className="think-settings-field--md" type="number" min={0} max={2000} value={config.maxContentLength ?? 160} onInput={(event) => patch({ maxContentLength: Number((event.currentTarget as HTMLInputElement).value) || 0 })} />
                    </ConfigFieldRow>
                </div>

                <div className="think-settings-actions think-settings-actions--start">
                    <ThinkButton
                        size="sm"
                        variant="secondary"
                        onClick={() => patch({ contentField: CONTENT_FIELD_KEY, titleField: 'title', timeField: 'date', maxContentLength: 160 })}
                    >
                        使用推荐字段
                    </ThinkButton>
                    <ThinkButton
                        size="sm"
                        variant="secondary"
                        onClick={() => patch({ contentField: FULL_DATA_FIELD_KEY })}
                    >
                        内容改为完整数据调试
                    </ThinkButton>
                </div>
            </ConfigSection>
        </ViewEditorShell>
    );
}
