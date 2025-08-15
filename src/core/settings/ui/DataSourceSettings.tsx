// src/core/settings/ui/DataSourceSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { DEFAULT_NAMES } from '@core/domain/constants';
import { 
    Accordion, AccordionSummary, AccordionDetails, Typography, IconButton, 
    Stack, Box, TextField, Tooltip, Autocomplete, Chip, Button 
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { usePersistentState } from '@shared/hooks/usePersistentState';
import { LOCAL_STORAGE_KEYS } from '@core/domain/constants';
import { getAllFields, readField } from '@core/domain/schema';
import { DataStore } from '@core/services/dataStore';
import { useMemo, useState, useEffect } from 'preact/hooks';
import type { DataSource } from '@core/domain/schema';
// --- 新增：导入我们自己的组件 ---
import { SimpleSelect } from '@shared/ui/SimpleSelect';

// (useUniqueFieldValues 函数保持不变)
function useUniqueFieldValues() {
    return useMemo(() => {
        const items = DataStore.instance.queryItems();
        const allKnownFields = new Set<string>(getAllFields(items));
        const valueMap: Record<string, Set<string>> = {};
        allKnownFields.forEach(field => valueMap[field] = new Set());
        for (const item of items) {
            for (const field of allKnownFields) {
                const value = readField(item, field);
                if (value === null || value === undefined || String(value).trim() === '') continue;
                const values = Array.isArray(value) ? value : [value];
                values.forEach(v => {
                    const strV = String(v).trim();
                    if (strV) valueMap[field].add(strV);
                });
            }
        }
        const result: Record<string, string[]> = {};
        for(const field in valueMap) {
            if(valueMap[field].size > 0) {
               result[field] = Array.from(valueMap[field]).sort((a,b) => a.localeCompare(b, 'zh-CN'));
            }
        }
        return result;
    }, []);
}

const defaultFilterRule = { field: '', op: '=', value: '' };
const defaultSortRule = { field: '', dir: 'asc' };

function RuleBuilder({ title, mode, rows, fieldOptions, onChange }: any) {
    const isFilterMode = mode === 'filter';
    const [newRule, setNewRule] = useState(isFilterMode ? defaultFilterRule : defaultSortRule);
    const uniqueFieldValues = useUniqueFieldValues();
    const remove = (i:number)=>onChange(rows.filter((_,j)=>j!==i));
    const updateNewRule = (patch: Partial<typeof newRule>) => {
        setNewRule(current => ({ ...current, ...patch }));
    };
    const handleAddRule = () => {
        if (!newRule.field) {
            alert('请选择一个字段');
            return;
        }
        onChange([...rows, newRule]);
        setNewRule(isFilterMode ? defaultFilterRule : defaultSortRule);
    };
    const formatRule = (rule: any) => {
        if (isFilterMode) {
            return `${rule.field} ${rule.op} "${rule.value}"`;
        }
        return `${rule.field} ${rule.dir === 'asc' ? '升序' : '降序'}`;
    };

    // --- 将 <MenuItem> 的选项转换为 SimpleSelect 需要的格式 ---
    const fieldSelectOptions = fieldOptions.map((f: string) => ({ value: f, label: f }));
    const operatorOptions = ['=','!=','includes','regex','>','<'].map(op => ({ value: op, label: op }));
    const directionOptions = [{value: 'asc', label: '升序'}, {value: 'desc', label: '降序'}];

    return (
        <Stack direction="row" spacing={2}>
            <Typography sx={{ width: '80px', flexShrink: 0, fontWeight: 500, pt: '8px' }}>{title}</Typography>
            <Stack spacing={1.5} sx={{flexGrow: 1}}>
                <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap>
                    {rows.map((rule: any, i: number) => (
                        <Tooltip key={i} title={`点击删除规则: ${formatRule(rule)}`}>
                            <Chip 
                                label={formatRule(rule)} 
                                onClick={() => remove(i)}
                                size="small" 
                            />
                        </Tooltip>
                    ))}
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                    {/* --- 重构：使用 SimpleSelect --- */}
                    <SimpleSelect
                        fullWidth
                        placeholder="选择字段"
                        value={newRule.field}
                        options={fieldSelectOptions}
                        onChange={val => updateNewRule({ field: val })}
                    />
                    {isFilterMode ? (
                        <SimpleSelect
                            value={newRule.op}
                            options={operatorOptions}
                            onChange={val => updateNewRule({ op: val })}
                            sx={{ minWidth: 120 }}
                        />
                    ) : (
                        <SimpleSelect
                            value={newRule.dir}
                            options={directionOptions}
                            onChange={val => updateNewRule({ dir: val })}
                            sx={{ minWidth: 100 }}
                        />
                    )}
                    {isFilterMode && (
                        <Autocomplete
                            freeSolo fullWidth size="small"
                            disableClearable
                            options={uniqueFieldValues[newRule.field] || []}
                            value={newRule.value}
                            onInputChange={(_, newValue) => updateNewRule({ value: newValue || '' })}
                            renderInput={(params) => <TextField {...params} variant="outlined" placeholder="输入值" />}
                        />
                    )}
                    <Button variant="contained" size="small" onClick={handleAddRule} startIcon={<AddIcon />}>
                        添加
                    </Button>
                </Stack>
            </Stack>
        </Stack>
    );
}

// DataSourceEditor 和 DataSourceSettings 组件的其余部分保持不变，
// 只需要确保它们在同一个文件中，并且顶部的导入语句已更新。
// ... (DataSourceEditor, DataSourceSettings 的 JSX 代码与之前相同)

function DataSourceEditor({ ds }: { ds: DataSource }) {
    const fieldOptions = useMemo(() => {
        const allItems = DataStore.instance.queryItems();
        return getAllFields(allItems);
    }, []);
    const [name, setName] = useState(ds.name);

    useEffect(() => {
        setName(ds.name);
    }, [ds]);

    const handleUpdate = (updates: Partial<DataSource>) => {
        AppStore.instance.updateDataSource(ds.id, updates);
    };

    const handleNameBlur = () => {
        if (name !== ds.name) {
            handleUpdate({ name: name });
        }
    };

    return (
        <Stack spacing={2} sx={{p: '8px 16px'}}>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ width: '80px', flexShrink: 0, fontWeight: 500 }}>名称</Typography>
                <TextField
                    variant="outlined" size="small"
                    value={name}
                    onChange={e => setName((e.target as HTMLInputElement).value)}
                    onBlur={handleNameBlur}
                    sx={{maxWidth: '400px'}}
                />
            </Stack>
            <RuleBuilder
                title="过滤规则"
                mode="filter"
                rows={ds.filters}
                fieldOptions={fieldOptions}
                onChange={(rows: any) => handleUpdate({ filters: rows })}
            />
            <RuleBuilder
                title="排序规则"
                mode="sort"
                rows={ds.sort}
                fieldOptions={fieldOptions}
                onChange={(rows: any) => handleUpdate({ sort: rows })}
            />
        </Stack>
    );
}

export function DataSourceSettings() {
    const dataSources = useStore(state => state.settings.dataSources);
    const [openId, setOpenId] = usePersistentState<string | null>(LOCAL_STORAGE_KEYS.SETTINGS_DATASOURCE_OPEN, null);

    const handleAdd = () => {
        const newName = DEFAULT_NAMES.NEW_DATASOURCE;
        AppStore.instance.addDataSource(newName).then(() => {
            const latestDs = AppStore.instance.getSettings().dataSources.at(-1);
            if (latestDs) setOpenId(latestDs.id);
        });
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`确认删除数据源 "${name}" 吗？\n引用此数据源的视图将失效。`)) {
            AppStore.instance.deleteDataSource(id);
        }
    };

    const handleDuplicate = (id: string) => {
        AppStore.instance.duplicateDataSource(id);
    };

    const handleMove = (id: string, direction: 'up' | 'down') => {
        AppStore.instance.moveDataSource(id, direction);
    };

    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Typography variant="h6">管理数据源</Typography>
                <Tooltip title="新增数据源">
                    <IconButton onClick={handleAdd} color="success">
                        <AddCircleOutlineIcon />
                    </IconButton>
                </Tooltip>
            </Stack>
            <Stack spacing={1}>
                {dataSources.map((ds, index) => (
                    <Accordion
                        key={ds.id}
                        expanded={openId === ds.id}
                        onChange={() => setOpenId(openId === ds.id ? null : ds.id)}
                        disableGutters
                        elevation={1}
                        sx={{ '&:before': { display: 'none' } }}
                    >
                        <AccordionSummary
                            sx={{
                                minHeight: 48,
                                '& .MuiAccordionSummary-content': { my: '12px', alignItems: 'center', justifyContent: 'space-between' },
                                cursor: 'pointer',
                            }}
                        >
                            <Typography fontWeight={500}>{ds.name}</Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <Tooltip title="上移">
                                    <span>
                                        <IconButton size="small" sx={{ fontSize: '1.2em' }} disabled={index === 0} onClick={e => { e.stopPropagation(); handleMove(ds.id, 'up'); }}>
                                            ▲
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="下移">
                                    <span>
                                        <IconButton size="small" sx={{ fontSize: '1.2em' }} disabled={index === dataSources.length - 1} onClick={e => { e.stopPropagation(); handleMove(ds.id, 'down'); }}>
                                            ▼
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="复制此数据源">
                                    <IconButton size="small" onClick={e => { e.stopPropagation(); handleDuplicate(ds.id); }}>
                                        <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="删除此数据源">
                                    <IconButton
                                        size="small"
                                        onClick={e => { e.stopPropagation(); handleDelete(ds.id, ds.name); }}
                                        sx={{ color: 'text.secondary', opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}
                                    >
                                        <DeleteForeverOutlinedIcon />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ bgcolor: 'action.hover', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                            <DataSourceEditor ds={ds} />
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Stack>
        </Box>
    );
}