// src/features/settings/ui/components/view-editors/HeatmapViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Stack, Typography, FormControlLabel, Radio, RadioGroup, Box, Button } from '@mui/material';
import type { ViewEditorProps } from './registry';
import { SimpleSelect } from '../../../../../ui/composites/SimpleSelect';
import { ListEditor } from '../../../../../ui/composites/form/ListEditor';
import { useStore } from '../../../../../store/AppStore';
import { useMemo } from 'preact/hooks';
// [修改] 从注册表导入 dataStore
import { dataStore } from '../../../../../store/storeRegistry';
import { filterByRules } from '../../../../../lib/utils/core/itemFilter';
import { Notice } from 'obsidian';

// 视图的默认配置
export const DEFAULT_CONFIG = {
    displayMode: 'habit', // 'habit' or 'count'
    sourceBlockId: '', // For 'habit' mode
    themePaths: [] as string[], // [修复] 主题路径列表（用于多行显示）
    countColors: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'], // For 'count' mode
};

export function HeatmapViewEditor({ value, onChange, module }: ViewEditorProps) {
    const config = { ...DEFAULT_CONFIG, ...value };
    const allBlocks = useStore(state => state.settings.inputSettings.blocks);
    const allDataSources = useStore(state => state.settings.dataSources);

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

        // [修复] 从注册表获取 dataStore 实例
        if (!dataStore) {
            new Notice('数据存储服务尚未准备就绪。');
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
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ width: '80px', flexShrink: 0, fontWeight: 500 }}>显示模式</Typography>
                <RadioGroup row value={config.displayMode} onChange={e => onChange({ displayMode: e.target.value })}>
                    <FormControlLabel value="habit" control={<Radio size="small" />} label="打卡模式" />
                    <FormControlLabel value="count" control={<Radio size="small" />} label="数量热力图" />
                </RadioGroup>
            </Stack>

            {config.displayMode === 'habit' && (
                <div>
                    <Stack direction="row" alignItems="center" spacing={2}>
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
            )}

            {config.displayMode === 'count' && (
                <Stack direction="row" alignItems="flex-start" spacing={2}>
                    <Typography sx={{ width: '80px', flexShrink: 0, fontWeight: 500, pt: '8px' }}>颜色阶梯</Typography>
                    <Box sx={{ flexGrow: 1 }}>
                       <ListEditor
                           value={config.countColors}
                           onChange={val => onChange({ countColors: val })}
                           type="color"
                           placeholder="#hexcolor"
                       />
                       <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                           从上到下依次代表 0, 1, 2, ... 个项目的颜色。
                       </Typography>
                    </Box>
                </Stack>
            )}
        </Stack>
    );
}
