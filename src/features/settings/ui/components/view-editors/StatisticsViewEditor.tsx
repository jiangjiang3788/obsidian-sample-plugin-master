// src/features/settings/ui/components/view-editors/StatisticsViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Stack, Typography, Box, IconButton, TextField, Tooltip } from '@mui/material';
import type { ViewEditorProps } from './registry';
// [修改] 从注册表导入 dataStore
import { dataStore } from '@state/storeRegistry';
import { useMemo, useState, useEffect } from 'preact/hooks';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

// 视图的默认配置
export const DEFAULT_CONFIG = {
    categories: [] as { name: string; color: string; }[],
};

// 随机生成一个颜色
const getRandomColor = () => `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;

export function StatisticsViewEditor({ value, onChange }: ViewEditorProps) {
    const config = { ...DEFAULT_CONFIG, ...value };
    const [localCategories, setLocalCategories] = useState(config.categories);

    // 自动发现所有基础分类
    const discoveredCategories = useMemo(() => {
        // [修复] 从注册表获取 dataStore 实例
        if (!dataStore) return [];
        const allItems = dataStore.queryItems();
        const categorySet = new Set<string>();
        allItems.forEach(item => {
            const baseCategory = (item.categoryKey || '').split('/')[0];
            if (baseCategory) {
                categorySet.add(baseCategory);
            }
        });
        return Array.from(categorySet).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    }, []);

    // 同步发现的分类和已保存的分类
    useEffect(() => {
        const existingNames = new Set(config.categories.map(c => c.name));
        const newCategories = [...config.categories];
        let changed = false;
        discoveredCategories.forEach(name => {
            if (!existingNames.has(name)) {
                newCategories.push({ name, color: getRandomColor() });
                changed = true;
            }
        });
        if (changed) {
            setLocalCategories(newCategories);
            onChange({ categories: newCategories });
        } else {
            setLocalCategories(config.categories);
        }
    }, [discoveredCategories, config.categories]);

    // 使用上下按钮调整顺序
    const handleMove = (index: number, direction: 'up' | 'down') => {
        const newCategories = [...localCategories];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newCategories.length) return;

        [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
        
        setLocalCategories(newCategories);
        onChange({ categories: newCategories });
    };

    const handleColorChange = (index: number, color: string) => {
        const newCategories = [...localCategories];
        newCategories[index].color = color;
        setLocalCategories(newCategories);
        onChange({ categories: newCategories });
    };

    return (
        <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>分类配置</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                插件已自动识别出您数据中的所有分类。您可以使用上下按钮调整顺序，或修改颜色。
            </Typography>
            <div>
                {localCategories.map((cat, index) => (
                    <Stack 
                        key={cat.name}
                        direction="row" 
                        spacing={1.5} 
                        alignItems="center"
                        sx={{ mb: 1, p:1, bgcolor: 'action.hover', borderRadius: 1 }}
                    >
                        <Stack>
                            <Tooltip title="上移"><span>
                                <IconButton size="small" disabled={index === 0} onClick={() => handleMove(index, 'up')}><ArrowUpwardIcon sx={{ fontSize: '1rem' }} /></IconButton>
                            </span></Tooltip>
                            <Tooltip title="下移"><span>
                                <IconButton size="small" disabled={index === localCategories.length - 1} onClick={() => handleMove(index, 'down')}><ArrowDownwardIcon sx={{ fontSize: '1rem' }} /></IconButton>
                            </span></Tooltip>
                        </Stack>
                        <TextField
                            type="color"
                            value={cat.color}
                            onChange={(e) => handleColorChange(index, (e.target as HTMLInputElement).value)}
                            sx={{ minWidth: 60, p: '2px' }}
                        />
                        <Typography sx={{ flexGrow: 1, fontWeight: 500 }}>{cat.name}</Typography>
                    </Stack>
                ))}
            </div>
        </Stack>
    );
}