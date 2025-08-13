// src/core/settings/ui/LayoutSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { Accordion, AccordionSummary, AccordionDetails, Box, Stack, Typography, IconButton, TextField, Select, MenuItem, Checkbox, FormControlLabel, Autocomplete, Tooltip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { usePersistentState } from '@shared/hooks/usePersistentState';
import { LOCAL_STORAGE_KEYS, DEFAULT_NAMES } from '@core/domain/constants';
import type { Layout } from '@core/domain/schema';

function LayoutEditor({ layout }: { layout: Layout }) {
    const allViews = useStore(state => state.settings.viewInstances);
    const selectedViews = layout.viewInstanceIds.map(id => allViews.find(v => v.id === id)).filter(Boolean);

    const handleUpdate = (updates: Partial<Layout>) => {
        AppStore.instance.updateLayout(layout.id, updates);
    };

    return (
        <Stack spacing={2}>
            {/* [MOD] 布局名称和隐藏工具栏放在一行 */}
            <Stack direction="row" spacing={2} alignItems="center">
                <TextField 
                    label="布局名称" 
                    defaultValue={layout.name} 
                    onBlur={e => handleUpdate({ name: (e.target as HTMLInputElement).value })}
                    sx={{ flex: 1 }}
                />
                <Tooltip title="勾选后，此布局在页面中将不显示顶部的 年/季/月/周/天 工具栏">
                    <FormControlLabel 
                        control={<Checkbox checked={!!layout.hideToolbar} onChange={e => handleUpdate({ hideToolbar: e.target.checked })} />} 
                        label="隐藏工具栏" 
                        sx={{ flexShrink: 0 }}
                    />
                </Tooltip>
            </Stack>

            <Autocomplete
                multiple
                options={allViews}
                value={selectedViews}
                getOptionLabel={(option) => option.title}
                onChange={(_, newValue) => handleUpdate({ viewInstanceIds: newValue.map(v => v.id) })}
                renderInput={(params) => <TextField {...params} variant="filled" label="包含的视图" />}
            />

            <Stack direction="row" spacing={2}>
                <Select label="显示模式" value={layout.displayMode || 'list'} onChange={e => handleUpdate({ displayMode: e.target.value as 'list' | 'grid' })} variant="filled" sx={{ flex: 1 }}>
                    <MenuItem value="list">列表</MenuItem>
                    <MenuItem value="grid">网格</MenuItem>
                </Select>
                {layout.displayMode === 'grid' && (
                    <TextField
                        label="网格列数"
                        type="number"
                        variant="filled"
                        value={layout.gridConfig?.columns || 2}
                        onChange={e => handleUpdate({ gridConfig: { columns: parseInt((e.target as HTMLInputElement).value, 10) || 2 } })}
                        sx={{ flex: 1 }}
                    />
                )}
            </Stack>

            {!layout.hideToolbar && (
                 <Stack direction="row" spacing={2}>
                    <Select label="初始视图" value={layout.initialView || '月'} onChange={e => handleUpdate({ initialView: e.target.value as string })} variant="filled" sx={{flex:1}}>
                        {['年','季','月','周','天'].map(v=><MenuItem key={v} value={v}>{v}</MenuItem>)}
                    </Select>
                    <TextField label="初始日期" type="date" variant="filled" defaultValue={layout.initialDate || ''} onBlur={e => handleUpdate({ initialDate: (e.target as HTMLInputElement).value })} sx={{flex:1}} InputLabelProps={{ shrink: true }}/>
                 </Stack>
            )}
        </Stack>
    );
}

export function LayoutSettings() {
    const layouts = useStore(state => state.settings.layouts);
    const [openId, setOpenId] = usePersistentState<string | null>(LOCAL_STORAGE_KEYS.SETTINGS_LAYOUT_OPEN, null);
    
    const handleAdd = () => {
        AppStore.instance.addLayout(DEFAULT_NAMES.NEW_LAYOUT).then(() => {
            const latestLayout = AppStore.instance.getSettings().layouts.at(-1);
            if(latestLayout) setOpenId(latestLayout.id);
        });
    };

    const handleDelete = (id: string) => {
        if (confirm('确认删除此布局吗？')) {
            AppStore.instance.deleteLayout(id);
        }
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">管理布局</Typography>
                <IconButton onClick={handleAdd} title="新增布局"><AddIcon /></IconButton>
            </Stack>
            <Stack spacing={1}>
                {layouts.map(l => (
                    <Accordion key={l.id} expanded={openId === l.id} onChange={() => setOpenId(openId === l.id ? null : l.id)} disableGutters elevation={2}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                           <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                                <Typography>{l.name}</Typography>
                                <IconButton size="small" color="error" onClick={e => { e.stopPropagation(); handleDelete(l.id); }} title="删除">
                                    <DeleteIcon />
                                </IconButton>
                            </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ bgcolor: 'action.hover' }}>
                            <LayoutEditor layout={l} />
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Stack>
        </Box>
    );
}