// @ts-nocheck
// src/features/settings/ui/components/view-editors/HeatmapViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Stack, Typography, FormControlLabel, Radio, RadioGroup, Box, Button, Checkbox } from '@mui/material';
import type { ViewEditorProps } from './registry';
import { SimpleSelect } from '@shared/ui/composites/SimpleSelect';
import { ListEditor } from '@shared/ui/composites/form/ListEditor';
import { useStore } from '@/app/AppStore';
import { useMemo } from 'preact/hooks';
import { LEVEL_SYSTEM_PRESETS } from '@core/utils/levelingSystem';
import { HEATMAP_VIEW_DEFAULT_CONFIG } from '@core/config/viewConfigs';
import { collectThemePathsForHeatmap } from '@core/utils/heatmap';
import { Notice } from 'obsidian';

// 重新导出以保持兼容性
export { HEATMAP_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/config/viewConfigs';

export function HeatmapViewEditor({ value, onChange, module, dataStore }: ViewEditorProps) {
    const config = { ...HEATMAP_VIEW_DEFAULT_CONFIG, ...value };
    const allBlocks = useStore(state => state.settings.inputSettings.blocks);

    const blockOptions = useMemo(() => 
        allBlocks.map(b => ({ value: b.id, label: b.name })), 
        [allBlocks]
    );

    const handleScanThemes = () => {
        if (!config.sourceBlockId) {
            new Notice('请先选择源 Block 模板。');
            return;
        }

        const dataSource = module;
        const sourceBlock = allBlocks.find(b => b.id === config.sourceBlockId);
        if (!sourceBlock) {
            new Notice('找不到所选的 Block 模板。');
            return;
        }

        const items = dataStore.queryItems();

        const sortedThemes = collectThemePathsForHeatmap({
            items,
            dataSource,
            sourceBlock,
        });

        onChange({ themePaths: sortedThemes });
        new Notice(`扫描完成！已自动添加 ${sortedThemes.length} 个主题路径（来自分类 "${sourceBlock.name}"）。`);
    };

    return (
        <Stack spacing={2.5}>
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
        </Stack>
    );
}
