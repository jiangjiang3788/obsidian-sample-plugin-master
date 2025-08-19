// src/core/settings/ui/LayoutSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { Accordion, AccordionSummary, AccordionDetails, Box, Stack, Typography, IconButton, TextField, Checkbox, FormControlLabel, Tooltip, Chip, Radio, RadioGroup as MuiRadioGroup } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { usePersistentState } from '@shared/hooks/usePersistentState';
import { LOCAL_STORAGE_KEYS, DEFAULT_NAMES } from '@core/domain/constants';
import type { Layout } from '@core/domain/schema';
import { useState, useMemo, useCallback, useEffect } from 'preact/hooks';
// [新增] 导入 SimpleSelect
import { SimpleSelect } from '@shared/ui/SimpleSelect';

const PERIOD_OPTIONS = ['年', '季', '月', '周', '天'].map(v => ({ value: v, label: v }));
const DISPLAY_MODE_OPTIONS = [{ value: 'list', label: '列表' }, { value: 'grid', label: '网格' }];
const LABEL_WIDTH = '80px';

// AlignedRadioGroup 组件保持不变
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

    // [修改] 为 SimpleSelect 准备选项
    const availableViewOptions = availableViews.map(v => ({ value: v.id, label: v.title }));

    return (
        <Stack spacing={2} sx={{ p: '8px 16px' }}>
            {/* 名称、初始日期、周期、排列方式等部分保持不变 */}
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>布局名称</Typography>
                <TextField variant="outlined" size="small" value={name} onChange={e => setName((e.target as HTMLInputElement).value)} onBlur={handleNameBlur} sx={{ maxWidth: '400px', flexGrow: 1 }} />
                <FormControlLabel control={<Checkbox size="small" checked={!layout.hideToolbar} onChange={e => handleUpdate({ hideToolbar: !(e.target as HTMLInputElement).checked })} />} label={<Typography noWrap>显示工具栏</Typography>} sx={{ flexShrink: 0, mr: 0 }} />
            </Stack>
            <Stack direction="row" alignItems="center" spacing={2}>
                 <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>初始日期</Typography>
                 <TextField type="date" size="small" variant="outlined" disabled={!!layout.initialDateFollowsNow} defaultValue={layout.initialDate || ''} onBlur={e => handleUpdate({ initialDate: (e.target as HTMLInputElement).value })} sx={{ width: '170px' }} />
                 <FormControlLabel control={<Checkbox size="small" checked={!!layout.initialDateFollowsNow} onChange={e => handleUpdate({ initialDateFollowsNow: e.target.checked })} />} label={<Typography noWrap>跟随今日</Typography>} />
            </Stack>
            <AlignedRadioGroup label="初始周期" options={PERIOD_OPTIONS} selectedValue={layout.initialView || '月'} onChange={(value: string) => handleUpdate({ initialView: value })} />
            <AlignedRadioGroup label="排列方式" options={DISPLAY_MODE_OPTIONS} selectedValue={layout.displayMode || 'list'} onChange={(value: string) => handleUpdate({ displayMode: value as 'list' | 'grid' })} />
            {layout.displayMode === 'grid' && (
                <Stack direction="row" alignItems="center" spacing={2} sx={{ pl: `calc(${LABEL_WIDTH} + 16px)` }}>
                    <TextField label="列数" type="number" size="small" variant="outlined" value={layout.gridConfig?.columns || 2} onChange={e => handleUpdate({ gridConfig: { columns: parseInt((e.target as HTMLInputElement).value, 10) || 2 } })} sx={{ width: '100px' }} />
                </Stack>
            )}

            <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap alignItems="center">
                <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>包含视图</Typography>
                {selectedViews.map(view => (
                    <Tooltip key={view.id} title={`点击移除 "${view.title}"`}>
                        <Chip label={view.title} onClick={() => removeView(view.id)} size="small" />
                    </Tooltip>
                ))}
                
                {/* [修改] 将 MUI Select 替换为 SimpleSelect */}
                <SimpleSelect
                    value=""
                    options={availableViewOptions}
                    onChange={addView}
                    placeholder="+ 添加视图..."
                    sx={{ minWidth: 150 }}
                />
            </Stack>
        </Stack>
    );
}

// LayoutSettings 组件的其余部分保持不变
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
    const handleDuplicate = (id: string) => AppStore.instance.duplicateLayout(id);
    const handleMove = (id: string, direction: 'up' | 'down') => AppStore.instance.moveLayout(id, direction);

    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Typography variant="h6">管理布局</Typography>
                <Tooltip title="新增布局"><IconButton onClick={handleAdd} color="success"><AddCircleOutlineIcon /></IconButton></Tooltip>
            </Stack>
            <Stack spacing={1}>
                {layouts.map((l, index) => (
                    <Accordion key={l.id} expanded={openId === l.id} onChange={() => setOpenId(openId === l.id ? null : l.id)} disableGutters elevation={1} sx={{ '&:before': { display: 'none' } }}>
                        <AccordionSummary>
                             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <Typography fontWeight={500}>{l.name}</Typography>
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <Tooltip title="上移"><span><IconButton size="small" sx={{ fontSize: '1.2em' }} disabled={index === 0} onClick={e => { e.stopPropagation(); handleMove(l.id, 'up'); }}>▲</IconButton></span></Tooltip>
                                    <Tooltip title="下移"><span><IconButton size="small" sx={{ fontSize: '1.2em' }} disabled={index === layouts.length - 1} onClick={e => { e.stopPropagation(); handleMove(l.id, 'down'); }}>▼</IconButton></span></Tooltip>
                                    <Tooltip title="复制此布局"><IconButton size="small" onClick={e => { e.stopPropagation(); handleDuplicate(l.id); }}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
                                    <Tooltip title="删除此布局"><IconButton size="small" onClick={e => { e.stopPropagation(); handleDelete(l.id, l.name); }} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}><DeleteForeverOutlinedIcon /></IconButton></Tooltip>
                                </Stack>
                             </Box>
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