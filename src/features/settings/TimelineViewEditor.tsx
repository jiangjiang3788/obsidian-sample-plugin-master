// src/features/settings/ui/components/view-editors/TimelineViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Stack, Typography, TextField, Button, IconButton, Tooltip } from '@mui/material';
import { ViewEditorProps } from './registry';
import AddIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/RemoveCircleOutline';
import { useMemo } from 'preact/hooks';

import { SimpleSelect } from '@shared/ui/composites/SimpleSelect';

export const DEFAULT_CONFIG = {
    defaultHourHeight: 50,
    MAX_HOURS_PER_DAY: 24,
    UNTRACKED_LABEL: "未记录",
    categories: {
        "工作": { color: "#60a5fa", files: ["工作", "Work"] },
        "学习": { color: "#34d399", files: ["学习", "Study"] },
        "生活": { color: "#fbbf24", files: ["生活", "Life"] },
    },
    progressOrder: ["工作", "学习", "生活"],
};

interface CategoryConfig {
    name?: string;
    color: string;
    files: string[];
}
type CategoriesMap = Record<string, CategoryConfig>;

export function TimelineViewEditor({ value, onChange, dataStore }: ViewEditorProps) {
    const viewConfig = { ...DEFAULT_CONFIG, ...value };
    const categories: CategoriesMap = viewConfig.categories || {};
    const progressOrder: string[] = viewConfig.progressOrder || [];

    const fileOptions = useMemo(() => {
        if (!dataStore) return [];
        const items = dataStore.queryItems();
        const fileNames = new Set<string>();
        items.forEach(item => {
            if (item.file?.basename) fileNames.add(item.file.basename);
        });
        return Array.from(fileNames).sort((a,b) => a.localeCompare(b, 'zh-CN'));
    }, [dataStore]);

    const handleConfigChange = (patch: Record<string, any>) => {
        onChange({ ...viewConfig, ...patch });
    };
    
    const handleCategoryChange = (oldName: string, newConfig: Partial<CategoryConfig>) => {
        const newName = (newConfig.name || oldName).trim();
        if (newName === oldName) {
            const newCategories = { ...categories };
            newCategories[oldName] = { ...newCategories[oldName], ...newConfig };
            delete newCategories[oldName].name;
            handleConfigChange({ categories: newCategories });
            return;
        }
        
        const newCategories: CategoriesMap = {};
        for (const key of progressOrder) {
            if (key === oldName) {
                newCategories[newName] = { ...categories[oldName], ...newConfig };
                delete newCategories[newName].name;
            } else if (categories[key]) {
                newCategories[key] = categories[key];
            }
        }
        const newProgressOrder = progressOrder.map((cat: string) => cat === oldName ? newName : cat);
        handleConfigChange({ categories: newCategories, progressOrder: newProgressOrder });
    };

    const addCategory = () => {
        let newName = `新分类`;
        let i = 1;
        while (categories[newName]) { newName = `新分类${i++}`; }
        handleConfigChange({
            categories: { ...categories, [newName]: { color: '#60a5fa', files: [] } },
            progressOrder: [...progressOrder, newName],
        });
    };

    const removeCategory = (nameToRemove: string) => {
        const { [nameToRemove]: _, ...rest } = categories;
        const newProgressOrder = progressOrder.filter((cat: string) => cat !== nameToRemove);
        handleConfigChange({ categories: rest, progressOrder: newProgressOrder });
    };

    const moveCategory = (index: number, direction: 'up' | 'down') => {
        const newOrder = [...progressOrder];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newOrder.length) return;
        [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
        handleConfigChange({ progressOrder: newOrder });
    };

    return (
        // @ts-ignore
        <Stack spacing={2.5}>
            {/* @ts-ignore */}
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ width: '80px', flexShrink: 0, fontWeight: 500 }}>小时高度</Typography>
                <TextField
                    type="number" size="small" variant="outlined"
                    value={viewConfig.defaultHourHeight}
                    onChange={e => handleConfigChange({ defaultHourHeight: Number((e.target as HTMLInputElement).value) })}
                    inputProps={{ min: 20, max: 200 }}
                    sx={{ width: '120px' }}
                />
            </Stack>
            {/* @ts-ignore */}
            <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>分类配置 (可排序)</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    通过 `▲▼` 调整分类在进度条中的显示顺序。
                </Typography>
                {progressOrder.map((name, index) => {
                    const catConfig = categories[name];
                    if (!catConfig) return null;

                    const availableFileOptions = fileOptions
                        .filter(f => !(catConfig.files || []).includes(f))
                        .map(f => ({ value: f, label: f }));

                    return (
                        <Box
                            key={name}
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'auto auto 140px 1fr auto',
                                gap: '12px',
                                alignItems: 'center',
                                mb: 1,
                            }}
                        >
                            <Stack direction="row" gridColumn="1 / 2">
                                {/* @ts-ignore */}
                                <Tooltip title="上移">
                                    <span>
                                        <IconButton size="small" disabled={index === 0} onClick={() => moveCategory(index, 'up')} sx={{ p: '4px', fontSize: '0.9rem' }}>▲</IconButton>
                                    </span>
                                </Tooltip>
                                {/* @ts-ignore */}
                                <Tooltip title="下移">
                                    <span>
                                        <IconButton size="small" disabled={index === progressOrder.length - 1} onClick={() => moveCategory(index, 'down')} sx={{ p: '4px', fontSize: '0.9rem' }}>▼</IconButton>
                                    </span>
                                </Tooltip>
                            </Stack>
                            <TextField
                                type="color" size="small"
                                value={catConfig.color || '#cccccc'}
                                onChange={e => handleCategoryChange(name, { color: (e.target as HTMLInputElement).value })}
                                sx={{ p: '2px', gridColumn: '2 / 3' }}
                            />
                            <TextField
                                variant="outlined" size="small"
                                defaultValue={name}
                                onBlur={e => handleCategoryChange(name, { name: (e.target as HTMLInputElement).value.trim() })}
                                sx={{ gridColumn: '3 / 4' }}
                            />
                            {/* @ts-ignore */}
                            <Box sx={{ minWidth: 0, gridColumn: '4 / 5' }}>
                                {/* @ts-ignore */}
                                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5} alignItems="center">
                                    {(catConfig.files || []).map(file => (
                                        // @ts-ignore
                                        <Tooltip key={file} title={`点击移除关键词: ${file}`}>
                                            <Box
                                                onClick={() => handleCategoryChange(name, { files: (catConfig.files || []).filter(f => f !== file) })}
                                                sx={{
                                                    bgcolor: 'action.hover',
                                                    color: 'text.primary',
                                                    p: '3px 8px',
                                                    borderRadius: '16px',
                                                    fontSize: '0.8125rem',
                                                    cursor: 'pointer',
                                                    '&:hover': {
                                                        bgcolor: 'action.disabledBackground',
                                                        textDecoration: 'line-through',
                                                    }
                                                }}
                                            >
                                                {file}
                                            </Box>
                                        </Tooltip>
                                    ))}
                                    {/* @ts-ignore */}
                                    <SimpleSelect
                                        value=""
                                        options={availableFileOptions}
                                        placeholder="+ 关键词..."
                                        onChange={(val) => handleCategoryChange(name, { files: [...(catConfig.files || []), val] })}
                                        sx={{ minWidth: 120 }}
                                    />
                                </Stack>
                            </Box>
                            {/* @ts-ignore */}
                            <IconButton onClick={() => removeCategory(name)} size="small" title="删除此分类" sx={{gridColumn: '5 / 6'}}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    )})}
                {/* @ts-ignore */}
                <Button startIcon={<AddIcon />} onClick={addCategory} size="small" sx={{justifyContent: 'flex-start', mt: 1}}>
                    添加新分类
                </Button>
            </Stack>
        </Stack>
    );
}
