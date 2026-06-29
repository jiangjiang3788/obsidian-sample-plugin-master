// src/features/settings/ui/components/view-editors/HeatmapViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Button, Checkbox, FormControlLabel, ListEditor, SimpleSelect } from '@shared/public';
import type { ViewEditorProps } from './registry';
import { useSelector, selectInputBlocks, useUiPort } from '@/app/public';
import { useMemo } from 'preact/hooks';
import {
    HEATMAP_VIEW_DEFAULT_CONFIG,
    collectThemePathsForHeatmap,
    type BlockTemplate,
    type HeatmapViewConfig,
    type ViewInstance,
} from '@core/public';
import { ConfigFieldRow, ConfigSection, ViewEditorShell } from './settingsEditorUi';

// 重新导出以保持兼容性
export { HEATMAP_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/public';

function normalizeHeatmapConfig(value: Record<string, any> | undefined): HeatmapViewConfig {
    const base = HEATMAP_VIEW_DEFAULT_CONFIG;
    const v = (value ?? {}) as Partial<HeatmapViewConfig>;

    return {
        displayMode: v.displayMode === 'habit' || v.displayMode === 'count' ? v.displayMode : base.displayMode,
        sourceBlockId: typeof v.sourceBlockId === 'string' ? v.sourceBlockId : base.sourceBlockId,
        themePaths: Array.isArray(v.themePaths)
            ? v.themePaths.filter((x): x is string => typeof x === 'string')
            : base.themePaths,
        maxDailyChecks: typeof v.maxDailyChecks === 'number' ? v.maxDailyChecks : base.maxDailyChecks,
        allowManualEdit: typeof v.allowManualEdit === 'boolean' ? v.allowManualEdit : base.allowManualEdit,
    };
}

export function HeatmapViewEditor({ value, onChange, module, dataStore }: ViewEditorProps) {
    const ui = useUiPort();
    const config = normalizeHeatmapConfig(value);
    const allBlocks = useSelector(selectInputBlocks);

    const blockOptions = useMemo(() =>
        allBlocks.map(b => ({ value: b.id, label: b.name })),
        [allBlocks]
    );

    const handleScanThemes = () => {
        if (!config.sourceBlockId) {
            ui.notice('请先选择源 Block 模板。');
            return;
        }

        // registry.tsx 中 module 是可选的；缺少上下文时禁用扫描。
        if (!module) {
            ui.notice('无法扫描：缺少视图上下文（module）。');
            return;
        }

        const dataSource: ViewInstance = module;
        const sourceBlock: BlockTemplate | undefined = allBlocks.find(b => b.id === config.sourceBlockId);
        if (!sourceBlock) {
            ui.notice('找不到所选的 Block 模板。');
            return;
        }

        const items = dataStore.queryItems();

        const sortedThemes = collectThemePathsForHeatmap({
            items,
            dataSource,
            sourceBlock,
        });

        onChange({ themePaths: sortedThemes });
        ui.notice(`扫描完成！已自动添加 ${sortedThemes.length} 个主题路径（来自分类 "${sourceBlock.name}"）。`);
    };

    return (
        <ViewEditorShell
            title="打卡视图"
            description="只负责主题 + 日期格子的记录入口：空白日期可新增，有记录日期查看当天记录并继续新增。经验/等级请使用独立的 ProgressView。"
            spacing={2.5}
        >
            <ConfigSection title="数据来源">
                <ConfigFieldRow
                    label="源 Block"
                    description="视图将从此 Block 模板的评分字段中读取 Emoji/图片/颜色映射。"
                    labelWidth={80}
                >
                    <SimpleSelect
                        value={config.sourceBlockId}
                        options={blockOptions}
                        onChange={val => onChange({ sourceBlockId: val })}
                        placeholder="-- 请选择用于打卡的 Block 模板 --"
                    />
                </ConfigFieldRow>
            </ConfigSection>

            <ConfigSection title="主题范围">
                <ConfigFieldRow
                    label="主题路径"
                    description="在此处添加的每个主题路径，在周/月视图下都会成为独立的一行。留空则显示所有打卡。"
                    alignItems="flex-start"
                    labelWidth={80}
                >
                    <ListEditor
                        value={config.themePaths}
                        onChange={val => onChange({ themePaths: val })}
                        placeholder="例如: 生活/健康, 工作/项目"
                    />
                    <Button onClick={handleScanThemes} size="small" sx={{ mt: 1 }}>从数据源扫描并添加主题</Button>
                </ConfigFieldRow>
            </ConfigSection>

            <ConfigSection title="交互">
                <FormControlLabel
                    control={(
                        <Checkbox
                            checked={!!config.allowManualEdit}
                            onChange={(event: Event) => onChange({ allowManualEdit: (event.target as HTMLInputElement).checked })}
                        />
                    )}
                    label="允许查看当天记录并新增"
                />
            </ConfigSection>
        </ViewEditorShell>
    );
}
