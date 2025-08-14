// src/core/settings/ui/LayoutSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { 
    Accordion, AccordionSummary, AccordionDetails, Box, Stack, Typography, 
    IconButton, TextField, Checkbox, FormControlLabel, Tooltip, Chip, 
    Select, MenuItem, Button, Radio, RadioGroup as MuiRadioGroup
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AddIcon from '@mui/icons-material/Add';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import { usePersistentState } from '@shared/hooks/usePersistentState';
import { LOCAL_STORAGE_KEYS, DEFAULT_NAMES } from '@core/domain/constants';
import type { Layout } from '@core/domain/schema';
import { useState, useMemo, useCallback, useEffect } from 'preact/hooks';

const PERIOD_OPTIONS = ['年', '季', '月', '周', '天'].map(v => ({ value: v, label: v }));
const DISPLAY_MODE_OPTIONS = [{ value: 'list', label: '列表' }, { value: 'grid', label: '网格' }];
const LABEL_WIDTH = '80px';

const AlignedRadioGroup = ({ label, options, selectedValue, onChange }: any) => (
    <Stack direction="row" alignItems="center" spacing={2}>
        <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>{label}</Typography>
        <MuiRadioGroup row value={selectedValue} onChange={(e) => onChange(e.target.value)}>
            {options.map((opt: any) => (
                <FormControlLabel
                    key={opt.value}
                    value={opt.value}
                    control={<Radio size="small" />}
                    label={opt.label}
                />
            ))}
        </MuiRadioGroup>
    </Stack>
);

function LayoutEditor({ layout }: { layout: Layout }) {
    const allViews = useStore(state => state.settings.viewInstances);
    const [viewToAdd, setViewToAdd] = useState<string>('');
    const [name, setName] = useState(layout.name);

    useEffect(() => {
        setName(layout.name);
    }, [layout]);

    const handleUpdate = useCallback((updates: Partial<Layout>) => {
        AppStore.instance.updateLayout(layout.id, updates);
    }, [layout.id]);

    const handleNameBlur = () => {
        if (name !== layout.name) {
            handleUpdate({ name: name });
        }
    };

    const selectedViews = useMemo(() =>
        layout.viewInstanceIds.map(id => allViews.find(v => v.id === id)).filter(Boolean),
        [layout.viewInstanceIds, allViews]
    );
    const availableViews = useMemo(() =>
        allViews.filter(v => !layout.viewInstanceIds.includes(v.id)),
        [layout.viewInstanceIds, allViews]
    );

    const addView = (viewId: string) => {
        if (viewId) {
            handleUpdate({ viewInstanceIds: [...layout.viewInstanceIds, viewId] });
        }
    };
    const removeView = (viewId: string) => {
        handleUpdate({ viewInstanceIds: layout.viewInstanceIds.filter(id => id !== viewId) });
    };

    return (
        <Stack spacing={2} sx={{ p: '8px 16px' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>布局名称</Typography>
                <TextField
                    variant="outlined" size="small"
                    value={name}
                    onChange={e => setName((e.target as HTMLInputElement).value)}
                    onBlur={handleNameBlur}
                    sx={{ maxWidth: '400px', flexGrow: 1 }}
                />
                <FormControlLabel
                    control={<Checkbox size="small" checked={!layout.hideToolbar} onChange={e => handleUpdate({ hideToolbar: !(e.target as HTMLInputElement).checked })} />}
                    label={<Typography noWrap>显示工具栏</Typography>}
                    sx={{ flexShrink: 0, mr: 0 }}
                />
            </Stack>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>初始日期</Typography>
                <TextField
                    type="date" size="small" variant="outlined"
                    disabled={!!layout.initialDateFollowsNow}
                    defaultValue={layout.initialDate || ''}
                    onBlur={e => handleUpdate({ initialDate: (e.target as HTMLInputElement).value })}
                    sx={{ width: '170px' }}
                />
                <FormControlLabel
                    control={<Checkbox size="small" checked={!!layout.initialDateFollowsNow} onChange={e => handleUpdate({ initialDateFollowsNow: e.target.checked })} />}
                    label={<Typography noWrap>跟随今日</Typography>}
                />
            </Stack>
            
            <AlignedRadioGroup
                label="初始周期"
                options={PERIOD_OPTIONS}
                selectedValue={layout.initialView || '月'}
                onChange={(value: string) => handleUpdate({ initialView: value })}
            />
            
            <AlignedRadioGroup
                label="排列方式"
                options={DISPLAY_MODE_OPTIONS}
                selectedValue={layout.displayMode || 'list'}
                onChange={(value: string) => handleUpdate({ displayMode: value as 'list' | 'grid' })}
            />
            {layout.displayMode === 'grid' && (
                <Stack direction="row" alignItems="center" spacing={2} sx={{pl: `calc(${LABEL_WIDTH} + 16px)`}}>
                     <TextField
                        label="列数" type="number" size="small" variant="outlined"
                        value={layout.gridConfig?.columns || 2}
                        onChange={e => handleUpdate({ gridConfig: { columns: parseInt((e.target as HTMLInputElement).value, 10) || 2 } })}
                        sx={{ width: '100px' }}
                    />
                </Stack>
            )}
            
            <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap alignItems="center">
                <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>包含视图</Typography>
                {selectedViews.map(view => (
                    <Tooltip key={view.id} title={`点击移除 "${view.title}"`}>
                        <Chip label={view.title} onClick={() => removeView(view.id)} size="small" />
                    </Tooltip>
                ))}
                <Select
                    size="small" displayEmpty value=""
                    onChange={(e) => addView(e.target.value as string)}
                    sx={{ minWidth: 150, '.MuiOutlinedInput-notchedOutline': { borderStyle: 'dashed' } }}
                    renderValue={() => <Typography color="text.secondary" sx={{fontSize: '0.875rem'}}><em>+ 添加视图...</em></Typography>}
                >
                    {availableViews.map(v => <MenuItem key={v.id} value={v.id}>{v.title}</MenuItem>)}
                </Select>
            </Stack>
        </Stack>
    );
}

export function LayoutSettings() {
    const layouts = useStore(state => state.settings.layouts);
    const [openId, setOpenId] = usePersistentState<string | null>(LOCAL_STORAGE_KEYS.SETTINGS_LAYOUT_OPEN, null);
    
    const handleAdd = () => {
        AppStore.instance.addLayout(DEFAULT_NAMES.NEW_LAYOUT).then(() => {
            const latestLayout = AppStore.instance.getSettings().layouts.at(-1);
            if (latestLayout) setOpenId(latestLayout.id);
        });
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`确认删除布局 "${name}" 吗？`)) {
            AppStore.instance.deleteLayout(id);
        }
    };

    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Typography variant="h6">管理布局</Typography>
                <Tooltip title="新增布局">
                    <IconButton onClick={handleAdd} color="success">
                        <AddCircleOutlineIcon />
                    </IconButton>
                </Tooltip>
            </Stack>
            <Stack spacing={1}>
                {layouts.map(l => (
                    <Accordion
                        key={l.id} expanded={openId === l.id}
                        onChange={() => setOpenId(openId === l.id ? null : l.id)}
                        disableGutters elevation={1}
                        sx={{ '&:before': { display: 'none' } }}
                    >
                        <AccordionSummary
                            sx={{
                                minHeight: 48,
                                '& .MuiAccordionSummary-content': { my: '12px', alignItems: 'center', justifyContent: 'space-between' },
                                cursor: 'pointer',
                            }}
                        >
                            <Typography fontWeight={500}>{l.name}</Typography>
                            <Tooltip title="删除此布局">
                                <IconButton
                                    size="small"
                                    onClick={e => { e.stopPropagation(); handleDelete(l.id, l.name); }}
                                    sx={{ color: 'text.secondary', opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}
                                >
                                    <DeleteForeverOutlinedIcon />
                                </IconButton>
                            </Tooltip>
                        </AccordionSummary>
                        <AccordionDetails sx={{ bgcolor: 'action.hover', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                            <LayoutEditor layout={l} />
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Stack>
        </Box>
    );
}