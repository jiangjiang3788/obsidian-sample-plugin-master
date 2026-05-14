// src/features/settings/ui/components/view-editors/TimelineViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';

import { Box, IconAction, Stack, Typography, TextField, Button, IconButton, Tooltip } from '@shared/public';
import AddIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/RemoveCircleOutline';

import { SimpleSelect } from '@shared/public';
import { collectFileNames, TIMELINE_VIEW_DEFAULT_CONFIG, type CategoryConfig, type TimelineViewConfig } from '@core/public';
import { ViewEditorProps } from './registry';

// 重新导出以保持兼容性
export { TIMELINE_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/public';

type CategoriesMap = Record<string, CategoryConfig>;

type TimelineConfigPatch = Partial<Pick<TimelineViewConfig, 'defaultHourHeight' | 'categories' | 'progressOrder'>>;

type CategoryPatchResult = { categories: CategoriesMap; progressOrder: string[] };

function normalizeProgressOrder(categories: CategoriesMap, progressOrder: string[]): string[] {
    // 1) remove non-existing categories
    const existing = progressOrder.filter((name) => Boolean(categories[name]));

    // 2) de-duplicate (keep first)
    const seen = new Set<string>();
    const unique = existing.filter((name) => {
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
    });

    // 3) append any missing category keys (stable order by insertion)
    for (const key of Object.keys(categories)) {
        if (!seen.has(key)) unique.push(key);
    }

    return unique;
}

function stripInlineName(config: CategoryConfig): CategoryConfig {
    // Category name lives in the map key; keep data clean.
    const { name: _inlineName, ...rest } = config;
    return { name: config.name, ...rest };
}

function nextCategoriesForRename(
    categories: CategoriesMap,
    progressOrder: string[],
    oldName: string,
    newName: string,
    newConfig: Partial<CategoryConfig>,
): CategoryPatchResult {
    const normalizedOrder = normalizeProgressOrder(categories, progressOrder);

    // If renaming to an existing category (other than itself), keep it safe: treat as no-op rename.
    const finalName = (newName || oldName).trim();
    const willCollide = finalName !== oldName && Boolean(categories[finalName]);
    const targetName = willCollide ? oldName : finalName;

    const merged: CategoryConfig = {
        ...(categories[oldName] || { name: oldName, color: '#cccccc', files: [] }),
        ...newConfig,
        name: targetName,
    };

    const nextCats: CategoriesMap = {};
    for (const key of normalizedOrder) {
        if (key === oldName) {
            nextCats[targetName] = stripInlineName(merged);
        } else if (categories[key]) {
            nextCats[key] = categories[key];
        }
    }

    // If the category key did not exist in order (edge-case), ensure it exists.
    if (!nextCats[targetName]) {
        nextCats[targetName] = stripInlineName(merged);
    }

    const nextOrder = normalizedOrder.map((k) => (k === oldName ? targetName : k));
    return { categories: nextCats, progressOrder: normalizeProgressOrder(nextCats, nextOrder) };
}

function HourHeightSetting(props: {
    hourHeight: number;
    onPatch: (patch: TimelineConfigPatch) => void;
}) {
    const { hourHeight, onPatch } = props;

    return (
        <Stack direction="row" alignItems="center" spacing={2}>
            <Typography sx={{ width: '80px', flexShrink: 0, fontWeight: 500 }}>小时高度</Typography>
            <TextField
                type="number"
                size="small"
                variant="outlined"
                value={hourHeight}
                onChange={(e: any) => onPatch({ defaultHourHeight: Number((e.target as HTMLInputElement).value) })}
                inputProps={{ min: 20, max: 200 }}
                sx={{ width: '120px' }}
            />
        </Stack>
    );
}

function CategoriesEditor(props: {
    categories: CategoriesMap;
    progressOrder: string[];
    fileOptions: string[];
    onPatch: (patch: TimelineConfigPatch) => void;
}) {
    const { categories, progressOrder, fileOptions, onPatch } = props;

    const handleCategoryChange = (oldName: string, newConfig: Partial<CategoryConfig>) => {
        const newName = (newConfig.name || oldName).trim();
        const next = nextCategoriesForRename(categories, progressOrder, oldName, newName, newConfig);
        onPatch(next);
    };

    const addCategory = () => {
        let newName = `新分类`;
        let i = 1;
        while (categories[newName]) {
            newName = `新分类${i++}`;
        }
        onPatch({
            categories: { ...categories, [newName]: { name: newName, color: '#60a5fa', files: [] } },
            progressOrder: [...progressOrder, newName],
        });
    };

    const removeCategory = (nameToRemove: string) => {
        const { [nameToRemove]: _removed, ...rest } = categories;
        const newProgressOrder = progressOrder.filter((cat: string) => cat !== nameToRemove);
        onPatch({ categories: rest, progressOrder: normalizeProgressOrder(rest, newProgressOrder) });
    };

    const moveCategory = (index: number, direction: 'up' | 'down') => {
        const newOrder = [...progressOrder];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newOrder.length) return;
        [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
        onPatch({ progressOrder: normalizeProgressOrder(categories, newOrder) });
    };

    return (
        <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                分类配置 (可排序)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                通过 `▲▼` 调整分类在进度条中的显示顺序。
            </Typography>

            {progressOrder.map((name, index) => {
                const catConfig = categories[name];
                if (!catConfig) return null;

                const availableFileOptions = fileOptions
                    .filter((f) => !(catConfig.files || []).includes(f))
                    .map((f) => ({ value: f, label: f }));

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
                        <Stack direction="row" sx={{ gridColumn: '1 / 2' }}>
                            <IconAction
                                label="上移"
                                disabled={index === 0}
                                onClick={() => moveCategory(index, 'up')}
                                sx={{ p: '4px', fontSize: '0.9rem' }}
                                icon={<span>▲</span>}
                            />
                            <IconAction
                                label="下移"
                                disabled={index === progressOrder.length - 1}
                                onClick={() => moveCategory(index, 'down')}
                                sx={{ p: '4px', fontSize: '0.9rem' }}
                                icon={<span>▼</span>}
                            />
                        </Stack>

                        <TextField
                            type="color"
                            size="small"
                            value={catConfig.color || '#cccccc'}
                            onChange={(e: any) =>
                                handleCategoryChange(name, {
                                    color: (e.target as HTMLInputElement).value,
                                })
                            }
                            sx={{ p: '2px', gridColumn: '2 / 3' }}
                        />

                        <TextField
                            variant="outlined"
                            size="small"
                            defaultValue={name}
                            onBlur={(e: any) =>
                                handleCategoryChange(name, {
                                    name: (e.target as HTMLInputElement).value.trim(),
                                })
                            }
                            sx={{ gridColumn: '3 / 4' }}
                        />

                        <Box sx={{ minWidth: 0, gridColumn: '4 / 5' }}>
                            <Stack
                                direction="row"
                                flexWrap="wrap"
                                useFlexGap
                                spacing={0.5}
                                alignItems="center"
                            >
                                {(catConfig.files || []).map((file) => (
                                    <Tooltip key={file} title={`点击移除关键词: ${file}`}>
                                        <Box
                                            onClick={() =>
                                                handleCategoryChange(name, {
                                                    files: (catConfig.files || []).filter(
                                                        (f) => f !== file,
                                                    ),
                                                })
                                            }
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
                                                },
                                            }}
                                        >
                                            {file}
                                        </Box>
                                    </Tooltip>
                                ))}

                                <SimpleSelect
                                    value=""
                                    options={availableFileOptions}
                                    placeholder="+ 关键词..."
                                    onChange={(val) =>
                                        handleCategoryChange(name, {
                                            files: [...(catConfig.files || []), val],
                                        })
                                    }
                                    sx={{ minWidth: 120 }}
                                />
                            </Stack>
                        </Box>

                        <IconButton
                            onClick={() => removeCategory(name)}
                            size="small"
                            title="删除此分类"
                            sx={{ gridColumn: '5 / 6' }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Box>
                );
            })}

            <Button
                startIcon={<AddIcon />}
                onClick={addCategory}
                size="small"
                sx={{ justifyContent: 'flex-start', mt: 1 }}
            >
                添加新分类
            </Button>
        </Stack>
    );
}

export function TimelineViewEditor({ value, onChange, dataStore }: ViewEditorProps) {
    const viewConfig: TimelineViewConfig = { ...TIMELINE_VIEW_DEFAULT_CONFIG, ...value };
    const categories: CategoriesMap = viewConfig.categories || {};
    const progressOrder: string[] = normalizeProgressOrder(categories, viewConfig.progressOrder || []);

    const fileOptions = useMemo(() => {
        if (!dataStore) return [];
        const items = dataStore.queryItems();
        return collectFileNames(items);
    }, [dataStore]);

    const handlePatch = (patch: TimelineConfigPatch) => {
        // IMPORTANT: ViewInstanceEditor already merges patch into correctedViewConfig.
        // Here we only emit the minimal patch to avoid double-merging and accidental clobbering.
        onChange(patch as Record<string, any>);
    };

    return (
        <Stack spacing={2.5}>
            <HourHeightSetting hourHeight={viewConfig.defaultHourHeight} onPatch={handlePatch} />

            <CategoriesEditor
                categories={categories}
                progressOrder={progressOrder}
                fileOptions={fileOptions}
                onPatch={handlePatch}
            />
        </Stack>
    );
}
