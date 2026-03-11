// src/features/settings/ui/components/view-editors/HeatmapViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Stack, Typography, Box, Button, FormControlLabel, Checkbox } from '@mui/material';
import type { ViewEditorProps } from './registry';
import { SimpleSelect } from '@shared/public';
import { ListEditor } from '@shared/public';
import { useSelector, selectInputBlocks, useUiPort } from '@/app/public';
import { useMemo } from 'preact/hooks';
import {
    HEATMAP_VIEW_DEFAULT_CONFIG,
    collectThemePathsForHeatmap,
    type BlockTemplate,
    type HeatmapViewConfig,
    type ViewInstance,
} from '@core/public';

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
        enableLeveling: typeof v.enableLeveling === 'boolean' ? v.enableLeveling : base.enableLeveling,
        maxDailyChecks: typeof v.maxDailyChecks === 'number' ? v.maxDailyChecks : base.maxDailyChecks,
        allowManualEdit: typeof v.allowManualEdit === 'boolean' ? v.allowManualEdit : base.allowManualEdit,
        showLevelProgress: typeof v.showLevelProgress === 'boolean' ? v.showLevelProgress : base.showLevelProgress,
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
        <Stack spacing={2.5}>
            <Typography variant="body2" color="text.secondary">
                打卡视图现在只负责记录入口：空白日期可新增，有记录日期查看当天记录并继续新增。经验/等级请使用独立的 ProgressView。
            </Typography>
            <div>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                    <Typography sx={{ width: '80px', flexShrink: 0, fontWeight: 500 }}>源 Block</Typography>
                    <Box sx={{ flexGrow: 1 }}>
                        <SimpleSelect
                            value={config.sourceBlockId}
                            options={blockOptions}
                            onChange={val => onChange({ sourceBlockId: val })}
                            placeholder="-- 请选择用于打卡的 Block 模板 --"
                        />
                         <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                             视图将从此 Block 模板的"评分"字段中读取 Emoji/图片/颜色映射。
                         </Typography>
                    </Box>
                </Stack>
                <Stack direction="row" alignItems="flex-start" spacing={2}>
                    <Typography sx={{ width: '80px', flexShrink: 0, fontWeight: 500, pt: '8px' }}>主题路径</Typography>
                    <Box sx={{ flexGrow: 1 }}>
                       <ListEditor
                           value={config.themePaths}
                           onChange={val => onChange({ themePaths: val })}
                           placeholder="例如: 生活/健康, 工作/项目"
                       />
                       <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                           在此处添加的每个主题路径，在周/月视图下都会成为独立的一行。留空则显示所有打卡。
                       </Typography>
                       <Button onClick={handleScanThemes} size="small" sx={{mt: 1}}>从数据源扫描并添加主题</Button>
                    </Box>
                </Stack>
            </div>
            <FormControlLabel control={<Checkbox checked={!!config.allowManualEdit} onChange={e => onChange({ allowManualEdit: (e.target as HTMLInputElement).checked })} />} label="允许查看当天记录并新增" />
        </Stack>
    );
}
