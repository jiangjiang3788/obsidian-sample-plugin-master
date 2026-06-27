// src/features/settings/ui/components/view-editors/StatisticsViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import type { ViewEditorProps } from './registry';
import { STATISTICS_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/public';

export { DEFAULT_CONFIG };

/**
 * StatisticsView 的控制权严格收敛：
 * - 时间周期由外部控制栏控制。
 * - 目标 / Block / 主题等筛选由视图筛选面板控制。
 * - 本编辑器只配置目标柱状块的展示方式，不再暴露分类维度或内部顶部控制。
 */
export function StatisticsViewEditor({ value, onChange }: ViewEditorProps) {
    const config = { ...DEFAULT_CONFIG, ...value, groupBy: 'goal' };

    return (
        <div class="think-statistics-editor">
            <div class="think-statistics-editor__section">
                <div class="think-statistics-editor__title">目标统计视图</div>
                <div class="think-statistics-editor__description">
                    StatisticsView 只按目标分组。时间范围使用上方控制栏，目标 / Block / 主题等条件使用视图筛选控制；“按照周期显示”只控制年/季/月视图内是否按 period 字段显示对应粒度。
                </div>
                <div class="think-settings-grid think-settings-grid--compact">
                    <label>
                        <div>显示目标数量</div>
                        <input
                            type="number"
                            min={1}
                            value={config.topN || 10}
                            onChange={(e) => onChange({ groupBy: 'goal', topN: Number((e.target as HTMLInputElement).value) || 10 })}
                        />
                    </label>
                    <label>
                        <div>柱状高度模式</div>
                        <select value={config.displayMode || 'smart'} onChange={(e) => onChange({ groupBy: 'goal', displayMode: (e.target as HTMLSelectElement).value })}>
                            <option value="smart">智能</option>
                            <option value="linear">线性</option>
                            <option value="logarithmic">对数</option>
                        </select>
                    </label>
                    <label>
                        <div>最小可见高度</div>
                        <input
                            type="number"
                            min={1}
                            max={100}
                            value={config.minVisibleHeight || 15}
                            onChange={(e) => onChange({ groupBy: 'goal', minVisibleHeight: Number((e.target as HTMLInputElement).value) || 15 })}
                        />
                    </label>
                    <label class="think-statistics-editor__period-toggle">
                        <input
                            type="checkbox"
                            checked={!!config.usePeriodField}
                            onChange={(e) => onChange({ groupBy: 'goal', usePeriodField: (e.target as HTMLInputElement).checked })}
                        />
                        <span>默认按照周期显示</span>
                    </label>
                </div>
            </div>
            <div class="think-statistics-editor__section">
                <div class="think-statistics-editor__description">
                    该视图不再维护分类配置；分类可继续作为视图筛选条件，但不会作为 Statistics 的主柱状维度。
                </div>
            </div>
        </div>
    );
}
