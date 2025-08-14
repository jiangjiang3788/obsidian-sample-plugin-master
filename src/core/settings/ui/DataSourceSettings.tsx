// src/core/settings/ui/DataSourceSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { DEFAULT_NAMES } from '@core/domain/constants';
import { 
    Accordion, AccordionSummary, AccordionDetails, Typography, IconButton, 
    Stack, Box, TextField, Tooltip, Select, MenuItem, Autocomplete, Chip, Button 
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { usePersistentState } from '@shared/hooks/usePersistentState';
import { LOCAL_STORAGE_KEYS } from '@core/domain/constants';
import { getAllFields, readField } from '@core/domain/schema';
import { DataStore } from '@core/services/dataStore';
import { useMemo, useState, useCallback, useEffect } from 'preact/hooks';
import type { DataSource } from '@core/domain/schema';

// --- Start of Merged RuleList Logic ---
function useUniqueFieldValues() { /* ... (no changes) ... */
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
                    <Select size="small" value={newRule.field} fullWidth variant="outlined" displayEmpty onChange={e => updateNewRule({ field: e.target.value })}>
                        <MenuItem value=""><em>选择字段</em></MenuItem>
                        {fieldOptions.map((o: string) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </Select>
                    {isFilterMode ? (
                        <Select size="small" value={newRule.op} variant="outlined" onChange={e => updateNewRule({ op: e.target.value })}>
                            {['=','!=','includes','regex','>','<'].map(op=><MenuItem key={op} value={op}>{op}</MenuItem>)}
                        </Select>
                    ) : (
                        <Select size="small" value={newRule.dir} variant="outlined" onChange={e => updateNewRule({ dir: e.target.value })}>
                            <MenuItem value="asc">升序</MenuItem>
                            <MenuItem value="desc">降序</MenuItem>
                        </Select>
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
// --- End of Merged RuleList Logic ---

function DataSourceEditor({ ds }: { ds: DataSource }) {
    const fieldOptions = useMemo(() => getAllFields(DataStore.instance.queryItems()), []);

    // [MODIFIED] 使用本地 state 来暂存所有修改
    const [localDs, setLocalDs] = useState(ds);
    
    // 当外部传入的 ds 对象变化时 (例如，切换折叠面板)，同步本地 state
    useEffect(() => {
        setLocalDs(ds);
    }, [ds]);
    
    // 计算本地修改是否与原始数据不同
    const hasChanges = useMemo(() => JSON.stringify(localDs) !== JSON.stringify(ds), [localDs, ds]);
    
    // 所有修改都先更新到本地 state
    const handleLocalUpdate = (updates: Partial<DataSource>) => {
        setLocalDs(current => ({...current, ...updates}));
    };

    // 点击保存按钮时，才将本地 state 提交到全局 AppStore
    const handleSave = () => {
        AppStore.instance.updateDataSource(localDs.id, localDs);
    };

    // 放弃修改，恢复到原始状态
    const handleRevert = () => {
        setLocalDs(ds);
    };

    return (
        <Stack spacing={2} sx={{p: '8px 16px'}}>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ width: '80px', flexShrink: 0, fontWeight: 500 }}>名称</Typography>
                <TextField
                    variant="outlined" size="small"
                    value={localDs.name}
                    onChange={e => handleLocalUpdate({ name: (e.target as HTMLInputElement).value })}
                    sx={{maxWidth: '400px'}}
                />
            </Stack>
            <RuleBuilder
                title="过滤规则"
                mode="filter"
                rows={localDs.filters}
                fieldOptions={fieldOptions}
                onChange={(rows: any) => handleLocalUpdate({ filters: rows })}
            />
            <RuleBuilder
                title="排序规则"
                mode="sort"
                rows={localDs.sort}
                fieldOptions={fieldOptions}
                onChange={(rows: any) => handleLocalUpdate({ sort: rows })}
            />
            {/* [NEW] 保存和取消按钮区域 */}
            {hasChanges && (
                <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{pt: 1}}>
                    <Button onClick={handleRevert} startIcon={<CancelIcon />}>
                        取消
                    </Button>
                    <Button variant="contained" onClick={handleSave} startIcon={<SaveIcon />}>
                        保存更改
                    </Button>
                </Stack>
            )}
        </Stack>
    );
}

export function DataSourceSettings() {
    const dataSources = useStore(state => state.settings.dataSources);
    const [openId, setOpenId] = usePersistentState<string | null>(LOCAL_STORAGE_KEYS.SETTINGS_DATASOURCE_OPEN, null);

    const handleAdd = () => {
        AppStore.instance.addDataSource(DEFAULT_NAMES.NEW_DATASOURCE).then(() => {
            const latestDs = AppStore.instance.getSettings().dataSources.at(-1);
            if (latestDs) setOpenId(latestDs.id);
        });
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`确认删除数据源 "${name}" 吗？\n引用此数据源的视图将失效。`)) {
            AppStore.instance.deleteDataSource(id);
        }
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
                {dataSources.map(ds => (
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
                            <Tooltip title="删除此数据源">
                                <IconButton
                                    size="small"
                                    onClick={e => { e.stopPropagation(); handleDelete(ds.id, ds.name); }}
                                    sx={{ color: 'text.secondary', opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}
                                >
                                    <DeleteForeverOutlinedIcon />
                                </IconButton>
                            </Tooltip>
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