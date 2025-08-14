// src/core/settings/ui/ViewInstanceSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { Accordion, AccordionSummary, AccordionDetails, Box, Stack, Typography, IconButton, TextField, Select, MenuItem, FormControlLabel, Checkbox, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { usePersistentState } from '@shared/hooks/usePersistentState';
import { LOCAL_STORAGE_KEYS, DEFAULT_NAMES } from '@core/domain/constants';
import { VIEW_OPTIONS, ViewName, getAllFields, Period } from '@core/domain/schema';
import type { ViewInstance } from '@core/domain/schema';
import { VIEW_EDITORS, VIEW_DEFAULT_CONFIGS } from '@features/dashboard/settings/ModuleEditors/registry';
import { PillMultiSelect } from '@shared/components/form/PillMultiSelect';
import { DataStore } from '@core/services/dataStore';
import { useMemo } from 'preact/hooks';

function ViewInstanceEditor({ vi }: { vi: ViewInstance }) {
    const dataSources = useStore(state => state.settings.dataSources);
    const fieldOptions = useMemo(() => getAllFields(DataStore.instance.queryItems()), []);
    const EditorComponent = VIEW_EDITORS[vi.viewType];
    const dateConfig = vi.dateConfig || { mode: 'inherit_from_layout' };

    const handleUpdate = (updates: Partial<ViewInstance>) => {
        AppStore.instance.updateViewInstance(vi.id, updates);
    };

    const handleViewTypeChange = (newViewType: ViewName) => {
        handleUpdate({
            viewType: newViewType,
            viewConfig: structuredClone(VIEW_DEFAULT_CONFIGS[newViewType]),
        });
    };
    
    const correctedViewConfig = useMemo(() => {
        if (vi.viewConfig && vi.viewConfig.viewConfig) {
            return vi.viewConfig.viewConfig;
        }
        return vi.viewConfig || {};
    }, [vi.viewConfig]);


    return (
        <Stack spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center">
                <TextField label="视图标题" defaultValue={vi.title} onBlur={e => handleUpdate({ title: (e.target as HTMLInputElement).value })} variant="filled" sx={{ flex: 1 }} />
                <Tooltip title="勾选后，此视图在布局中默认是折叠状态">
                    <FormControlLabel
                        control={<Checkbox checked={!!vi.collapsed} onChange={e => handleUpdate({ collapsed: e.target.checked })} />}
                        label="默认折叠"
                        sx={{ flexShrink: 0 }}
                    />
                </Tooltip>
            </Stack>
            
            <Stack direction="row" spacing={2}>
                <Select label="视图类型" value={vi.viewType} onChange={e => handleViewTypeChange(e.target.value as ViewName)} variant="filled" sx={{ flex: 1 }}>
                    {VIEW_OPTIONS.map(v => <MenuItem key={v} value={v}>{v.replace('View', '')}</MenuItem>)}
                </Select>
                <Select label="数据源" value={vi.dataSourceId} onChange={e => handleUpdate({ dataSourceId: e.target.value as string })} variant="filled" sx={{ flex: 1 }}>
                    <MenuItem value=""><em>-- 无 --</em></MenuItem>
                    {dataSources.map(ds => <MenuItem key={ds.id} value={ds.id}>{ds.name}</MenuItem>)}
                </Select>
            </Stack>

            {/* [NEW] 日期处理方式设置 */}
            <Box sx={{ border: '1px solid var(--background-modifier-border)', p: 1.5, borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>日期处理方式</Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Select 
                        label="模式" 
                        value={dateConfig.mode} 
                        onChange={e => handleUpdate({ dateConfig: { ...dateConfig, mode: e.target.value as any } })} 
                        variant="filled" 
                        sx={{ flex: 1 }}
                    >
                        <MenuItem value="inherit_from_layout">继承布局工具栏</MenuItem>
                        <MenuItem value="fixed_period">使用固定周期</MenuItem>
                    </Select>
                    {dateConfig.mode === 'fixed_period' && (
                        <Select 
                            label="固定周期"
                            value={dateConfig.period || '月'}
                            onChange={e => handleUpdate({ dateConfig: { ...dateConfig, period: e.target.value as Period } })}
                            variant="filled"
                            sx={{ flex: 1 }}
                        >
                            {['年', '季', '月', '周', '天'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                        </Select>
                    )}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{mt: 1, display: 'block'}}>
                    - **继承布局工具栏**: 视图的周期和日期由布局顶部的 年/季/月... 按钮和日期导航控制。
                    <br/>
                    - **使用固定周期**: 视图的周期是固定的，但仍会跟随布局的日期导航（上一周期/下一周期）同步更新。
                </Typography>
            </Box>

            <PillMultiSelect label="显示字段" value={vi.fields || []} options={fieldOptions} onChange={v => handleUpdate({ fields: v })} />
            <PillMultiSelect label="分组字段 (仅BlockView)" value={vi.group ? [vi.group] : []} options={fieldOptions} onChange={v => handleUpdate({ group: v[0] || undefined })} />

            {EditorComponent && (
                <Box sx={{ borderTop: '1px dashed #ccc', pt: 2, mt: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>{vi.viewType.replace('View','')} 专属配置</Typography>
                    <EditorComponent
                        value={correctedViewConfig}
                        onChange={(patch) => handleUpdate({ viewConfig: { ...correctedViewConfig, ...patch } })}
                        fieldOptions={fieldOptions}
                    />
                </Box>
            )}
        </Stack>
    );
}

export function ViewInstanceSettings() {
    const viewInstances = useStore(state => state.settings.viewInstances);
    const [openId, setOpenId] = usePersistentState<string | null>(LOCAL_STORAGE_KEYS.SETTINGS_VIEW_OPEN, null);

    const handleAdd = () => {
        AppStore.instance.addViewInstance(DEFAULT_NAMES.NEW_VIEW).then(() => {
            const latestVi = AppStore.instance.getSettings().viewInstances.at(-1);
            if (latestVi) setOpenId(latestVi.id);
        });
    };

    const handleDelete = (id: string) => {
        if (confirm('确认删除此视图吗？布局中对该视图的引用将被移除。')) {
            AppStore.instance.deleteViewInstance(id);
        }
    };
    
    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">管理视图</Typography>
                <IconButton onClick={handleAdd} title="新增视图"><AddIcon /></IconButton>
            </Stack>
            <Stack spacing={1}>
                {viewInstances.map(vi => (
                    <Accordion
                        key={vi.id}
                        expanded={openId === vi.id}
                        onChange={() => setOpenId(openId === vi.id ? null : vi.id)}
                        disableGutters
                        elevation={2}
                        sx={{ '&:before': { display: 'none' } }}
                    >
                        <AccordionSummary
                            sx={{
                                minHeight: 40,
                                '& .MuiAccordionSummary-content': { my: '10px' },
                                cursor: 'pointer',
                            }}
                        >
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                                <Typography fontWeight={500}>{vi.title}</Typography>
                                <IconButton size="small" color="error" onClick={e => { e.stopPropagation(); handleDelete(vi.id); }} title="删除" sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ bgcolor: 'action.hover', borderTop: '1px solid var(--background-modifier-border)' }}>
                            <ViewInstanceEditor vi={vi} />
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Stack>
        </Box>
    );
}