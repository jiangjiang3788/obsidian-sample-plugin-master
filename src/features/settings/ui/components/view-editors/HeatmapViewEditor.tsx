// src/features/settings/ui/components/view-editors/HeatmapViewEditor.tsx
/** @jsxImportSource preact */
import { Stack, Typography, FormControlLabel, Radio, RadioGroup, Box, Button } from '@mui/material';
import type { ViewEditorProps } from './registry';
import { SimpleSelect } from '@shared/ui/SimpleSelect';
import { ListEditor } from '@shared/components/form/ListEditor';
import { useStore } from '@state/AppStore';
import { useMemo } from 'preact/hooks';
// [修改] 从注册表导入 dataStore
import { dataStore } from '@state/storeRegistry';
import { filterByRules } from '@core/utils/itemFilter';
import { Notice } from 'obsidian';

// 视图的默认配置
export const DEFAULT_CONFIG = {
    displayMode: 'habit', // 'habit' or 'count'
    sourceBlockId: '', // For 'habit' mode
    themeTags: [], // For multi-row display in habit mode
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

    const handleScanTags = () => {
        if (!module?.dataSourceId) {
            new Notice('请先为此视图选择一个数据源。');
            return;
        }
        const dataSource = allDataSources.find(ds => ds.id === module.dataSourceId);
        if (!dataSource) {
            new Notice('找不到所选的数据源。');
            return;
        }

        // [修复] 从注册表获取 dataStore 实例
        if (!dataStore) {
            new Notice('数据存储服务尚未准备就绪。');
            return;
        }
        const items = dataStore.queryItems();
        const filteredItems = filterByRules(items, dataSource.filters);
        const tagSet = new Set<string>();
        filteredItems.forEach(item => {
            item.tags.forEach(tag => tagSet.add(tag));
        });
        
        const sortedTags = Array.from(tagSet).sort((a,b) => a.localeCompare(b, 'zh-CN'));
        onChange({ themeTags: sortedTags });
        new Notice(`扫描完成！已自动添加 ${sortedTags.length} 个主题标签。`);
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
                <Fragment>
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
                                 视图将从此 Block 模板的“评分”字段中读取 Emoji/图片/颜色映射。
                             </Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" alignItems="flex-start" spacing={2}>
                        <Typography sx={{ width: '80px', flexShrink: 0, fontWeight: 500, pt: '8px' }}>主题标签</Typography>
                        <Box sx={{ flexGrow: 1 }}>
                           <ListEditor
                               value={config.themeTags}
                               onChange={val => onChange({ themeTags: val })}
                               placeholder="例如: 生活健康/心情"
                           />
                           <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                               在此处添加的每个标签，在周/月视图下都会成为独立的一行。
                           </Typography>
                           <Button onClick={handleScanTags} size="small" sx={{mt: 1}}>从数据源扫描并添加主题</Button>
                        </Box>
                    </Stack>
                </Fragment>
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