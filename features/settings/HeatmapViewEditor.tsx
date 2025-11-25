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
import { filterByRules } from '@core/utils/itemFilter';
import { LEVEL_SYSTEM_PRESETS } from '@core/utils/levelingSystem';
import { Notice } from 'obsidian';

// 视图的默认配置
export const DEFAULT_CONFIG = {
    displayMode: 'habit', // 'habit' or 'count'
    sourceBlockId: '', // For 'habit' mode
    themePaths: [] as string[], // [修复] 主题路径列表（用于多行显示）
    // [新增] 等级系统配置
    enableLeveling: true,              // 启用等级系统
    maxDailyChecks: 10,               // 每日最大显示次数
    allowManualEdit: true,            // 允许手动编辑次数
    showLevelProgress: true,          // 显示等级进度条
};

export function HeatmapViewEditor({ value, onChange, module, dataStore }: ViewEditorProps) {
    const config = { ...DEFAULT_CONFIG, ...value };
    const allBlocks = useStore(state => state.settings.inputSettings.blocks);
    const allDataSources = useStore(state => state.settings.viewInstances);

    const blockOptions = useMemo(() => 
        allBlocks.map(b => ({ value: b.id, label: b.name })), 
        [allBlocks]
    );

    const handleScanThemes = () => {
        if (!module?.dataSourceId) {
            new Notice('请先为此视图选择一个数据源。');
            return;
        }
        if (!config.sourceBlockId) {
            new Notice('请先选择源 Block 模板。');
            return;
        }
        const dataSource = allDataSources.find(ds => ds.id === module.dataSourceId);
        if (!dataSource) {
            new Notice('找不到所选的数据源。');
            return;
        }

        // 获取源 Block 的名称作为 categoryKey 过滤条件
        const sourceBlock = allBlocks.find(b => b.id === config.sourceBlockId);
        if (!sourceBlock) {
            new Notice('找不到所选的 Block 模板。');
            return;
        }

        const items = dataStore.queryItems();
        const filteredItems = filterByRules(items, dataSource.filters);
        
        // [修复] 只扫描属于选定 Block (categoryKey) 的 items 的 theme 字段
        const themeSet = new Set<string>();
        filteredItems.forEach(item => {
            // 只统计 categoryKey 匹配源 Block 名称的 items
            if (item.categoryKey === sourceBlock.name && item.theme) {
                themeSet.add(item.theme);
            }
        });
        
        const sortedThemes = Array.from(themeSet).sort((a,b) => a.localeCompare(b, 'zh-CN'));
        onChange({ themePaths: sortedThemes });
        new Notice(`扫描完成！已自动添加 ${sortedThemes.length} 个主题路径（来自分类"${sourceBlock.name}"）。`);
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
