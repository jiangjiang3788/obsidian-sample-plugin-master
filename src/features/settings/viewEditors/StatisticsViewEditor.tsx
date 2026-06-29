// src/features/settings/ui/components/view-editors/StatisticsViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Checkbox, FormControlLabel, SimpleSelect, TextField } from '@shared/public';
import type { ViewEditorProps } from './registry';
import { STATISTICS_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/public';
import { ConfigFieldRow, ConfigSection, ViewEditorShell } from './settingsEditorUi';

export { DEFAULT_CONFIG };

const DISPLAY_MODE_OPTIONS = [
    { value: 'smart', label: '智能' },
    { value: 'linear', label: '线性' },
    { value: 'logarithmic', label: '对数' },
];

/**
 * StatisticsView 的控制权严格收敛：
 * - 时间周期由外部控制栏控制。
 * - 目标 / Block / 主题等筛选由视图筛选面板控制。
 * - 本编辑器只配置目标柱状块的展示方式，不再暴露分类维度或内部顶部控制。
 */
export function StatisticsViewEditor({ value, onChange }: ViewEditorProps) {
    const config = { ...DEFAULT_CONFIG, ...value, groupBy: 'goal' };

    return (
        <ViewEditorShell className="think-statistics-editor">
            <ConfigSection
                className="think-statistics-editor__section"
                title="目标统计视图"
                titleClassName="think-statistics-editor__title"
                descriptionClassName="think-statistics-editor__description"
                description="StatisticsView 只按目标分组。时间范围使用上方控制栏，目标 / Block / 主题等条件使用视图筛选控制；“按照周期显示”只控制年/季/月视图内是否按 period 字段显示对应粒度。"
            >
                <div class="think-settings-grid think-settings-grid--compact">
                    <ConfigFieldRow label="显示目标数量" labelWidth={104}>
                        <TextField
                            type="number"
                            size="small"
                            value={config.topN || 10}
                            onChange={(event: Event) => onChange({ groupBy: 'goal', topN: Number((event.target as HTMLInputElement).value) || 10 })}
                            inputProps={{ min: 1 }}
                        />
                    </ConfigFieldRow>
                    <ConfigFieldRow label="柱状高度模式" labelWidth={104}>
                        <SimpleSelect
                            value={config.displayMode || 'smart'}
                            options={DISPLAY_MODE_OPTIONS}
                            onChange={(displayMode) => onChange({ groupBy: 'goal', displayMode })}
                        />
                    </ConfigFieldRow>
                    <ConfigFieldRow label="最小可见高度" labelWidth={104}>
                        <TextField
                            type="number"
                            size="small"
                            value={config.minVisibleHeight || 15}
                            onChange={(event: Event) => onChange({ groupBy: 'goal', minVisibleHeight: Number((event.target as HTMLInputElement).value) || 15 })}
                            inputProps={{ min: 1, max: 100 }}
                        />
                    </ConfigFieldRow>
                    <FormControlLabel
                        class="think-statistics-editor__period-toggle"
                        control={(
                            <Checkbox
                                checked={!!config.usePeriodField}
                                onChange={(event: Event) => onChange({ groupBy: 'goal', usePeriodField: (event.target as HTMLInputElement).checked })}
                            />
                        )}
                        label="默认按照周期显示"
                    />
                </div>
            </ConfigSection>
            <ConfigSection
                className="think-statistics-editor__section"
                descriptionClassName="think-statistics-editor__description"
                description="该视图不再维护分类配置；分类可继续作为视图筛选条件，但不会作为 Statistics 的主柱状维度。"
            />
        </ViewEditorShell>
    );
}
