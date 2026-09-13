// src/features/settings/ui/components/view-editors/HeatmapViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import {
  ThinkButton,
  ThinkCheckbox,
  ListEditor,
  SimpleSelect,
} from '@shared/ui/public';
import type { ViewEditorProps } from './ViewEditorProps';
import { useSelector, selectInputRecordTypes, useUiPort } from '@/app/public';
import { useMemo } from 'preact/hooks';
import { HEATMAP_VIEW_DEFAULT_CONFIG, type HeatmapViewConfig } from '@core/view/public';
import { collectGoalPathsForHeatmap } from '@core/utils/public';
import type { RecordCaptureTemplate, ViewInstance } from '@core/types/public';
import { ConfigFieldRow, ConfigSection, ViewEditorShell } from './settingsEditorUi';

// 重新导出以保持兼容性

function normalizeHeatmapConfig(value: Record<string, any> | undefined): HeatmapViewConfig {
    const base = HEATMAP_VIEW_DEFAULT_CONFIG;
    const v = (value ?? {}) as Partial<HeatmapViewConfig>;

    return {
        displayMode: v.displayMode === 'habit' || v.displayMode === 'count' ? v.displayMode : base.displayMode,
        sourceRecordTypeId: typeof v.sourceRecordTypeId === 'string' ? v.sourceRecordTypeId : base.sourceRecordTypeId,
        goalPaths: Array.isArray(v.goalPaths)
            ? v.goalPaths.filter((x): x is string => typeof x === 'string')
            : base.goalPaths,
        maxDailyChecks: typeof v.maxDailyChecks === 'number' ? v.maxDailyChecks : base.maxDailyChecks,
        allowManualEdit: typeof v.allowManualEdit === 'boolean' ? v.allowManualEdit : base.allowManualEdit,
    };
}

export function HeatmapViewEditor({ value, onChange, module, dataStore }: ViewEditorProps) {
    const ui = useUiPort();
    const config = normalizeHeatmapConfig(value);
    const allRecordTypes = useSelector(selectInputRecordTypes);

    const recordTypeOptions = useMemo(() =>
        allRecordTypes.map(b => ({ value: b.id, label: b.name })),
        [allRecordTypes]
    );

    const handleScanGoals = () => {
        if (!config.sourceRecordTypeId) {
            ui.notice('请先选择源记录类型。');
            return;
        }

        // registry.tsx 中 module 是可选的；缺少上下文时禁用扫描。
        if (!module) {
            ui.notice('无法扫描：缺少视图上下文（module）。');
            return;
        }

        const dataSource: ViewInstance = module;
        const sourceRecordType: RecordCaptureTemplate | undefined = allRecordTypes.find(b => b.id === config.sourceRecordTypeId);
        if (!sourceRecordType) {
            ui.notice('找不到所选的记录类型。');
            return;
        }

        const items = dataStore.queryItems();

        const sortedGoals = collectGoalPathsForHeatmap({
            items,
            dataSource,
            sourceRecordType,
        });

        onChange({ goalPaths: sortedGoals });
        ui.notice(`扫描完成！已自动添加 ${sortedGoals.length} 个目标路径（来自记录类型 "${sourceRecordType.name}"）。`);
    };

    return (
        <ViewEditorShell
            title="打卡视图"
        >
            <ConfigSection title="数据来源">
                <ConfigFieldRow
                    label="源记录类型"
                    description="视图将从此记录类型模板的评分字段中读取 Emoji/图片/颜色映射。"
                >
                    <SimpleSelect
                        value={config.sourceRecordTypeId}
                        options={recordTypeOptions}
                        onChange={val => onChange({ sourceRecordTypeId: val })}
                        placeholder="-- 请选择用于打卡的记录类型 --"
                    />
                </ConfigFieldRow>
            </ConfigSection>

            <ConfigSection title="目标范围">
                <ConfigFieldRow
                    label="目标路径"
                    description="在此处添加的每个目标路径，在周/月视图下都会成为独立的一行。留空则显示所有目标下的打卡。"
                    alignItems="flex-start"
                >
                    <ListEditor
                        value={config.goalPaths}
                        onChange={val => onChange({ goalPaths: val })}
                        placeholder="例如: 照顾好自己/健康/睡眠"
                    />
                    <ThinkButton onClick={handleScanGoals} size="sm" variant="secondary">从数据源扫描并添加目标</ThinkButton>
                </ConfigFieldRow>
            </ConfigSection>

            <ConfigSection title="交互">
                <ConfigFieldRow label="手动编辑">
                    <ThinkCheckbox checked={!!config.allowManualEdit} onChange={(event) => onChange({ allowManualEdit: (event.currentTarget as HTMLInputElement).checked })} label="允许查看当天记录并新增" compact />
                </ConfigFieldRow>
            </ConfigSection>
        </ViewEditorShell>
    );
}
