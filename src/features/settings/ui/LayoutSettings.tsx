// src/features/settings/ui/LayoutSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
// [MODIFIED] Import Autocomplete
import { Box, Stack, Typography, TextField, Checkbox, FormControlLabel, Tooltip, Chip, Radio, RadioGroup as MuiRadioGroup, Autocomplete } from '@mui/material';
import type { Layout } from '@core/domain/schema';
import { useMemo, useCallback } from 'preact/hooks';
import { SimpleSelect } from '@shared/ui/SimpleSelect';
import { SettingsTreeView, TreeItem } from './components/SettingsTreeView';
import { App } from 'obsidian';
import { useSettingsManager } from './hooks/useSettingsManager';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove } from '@core/utils/array';

const PERIOD_OPTIONS = ['年', '季', '月', '周', '天'].map(v => ({ value: v, label: v }));
const DISPLAY_MODE_OPTIONS = [{ value: 'list', label: '列表' }, { value: 'grid', label: '网格' }];
const LABEL_WIDTH = '80px';

const AlignedRadioGroup = ({ label, options, selectedValue, onChange }: any) => (
    <Stack direction="row" alignItems="center" spacing={2}>
        <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>{label}</Typography>
        <MuiRadioGroup row value={selectedValue} onChange={(e) => onChange(e.target.value)}>
            {options.map((opt: any) => (
                <FormControlLabel key={opt.value} value={opt.value} control={<Radio size="small" />} label={opt.label} />
            ))}
        </MuiRadioGroup>
    </Stack>
);

function LayoutEditor({ layout, appStore }: { layout: Layout, appStore: AppStore }) {
    const allViews = useStore(state => state.settings.viewInstances);

    const handleUpdate = useCallback((updates: Partial<Layout>) => {
        appStore.updateLayout(layout.id, updates);
    }, [layout.id, appStore]);

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
    const availableViewOptions = availableViews.map(v => ({ value: v.id, label: v.title }));

    return (
        <Stack spacing={2} sx={{ p: '8px 16px 16px 50px' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>模式</Typography>
                <FormControlLabel
                    control={<Checkbox size="small" checked={!!layout.isOverviewMode} onChange={e => handleUpdate({ isOverviewMode: e.target.checked, initialDateFollowsNow: false })} />}
                    label={<Typography noWrap>启用概览模式</Typography>}
                    title="启用后，此布局将变为持久化时间导航模式，工具栏样式将改变，且时间不再跟随今日。"
                />
                <FormControlLabel
                    control={<Checkbox size="small" checked={!!layout.useFieldGranularity} onChange={e => handleUpdate({ useFieldGranularity: e.target.checked })} />}
                    label={<Typography noWrap>按字段粒度过滤</Typography>}
                    title="勾选后，将条目的字段粒度（年/季/月/周/天）与当前视图的时间窗口同时作为筛选条件。未勾选仅按时间窗口筛选。未设置粒度的条目默认当天。"
                />
            </Stack>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>工具栏</Typography>
                <FormControlLabel control={<Checkbox size="small" checked={!layout.hideToolbar} onChange={e => handleUpdate({ hideToolbar: !(e.target as HTMLInputElement).checked })} />} label={<Typography noWrap>显示工具栏/导航器</Typography>} sx={{ flexShrink: 0, mr: 0 }} />
            </Stack>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>初始日期</Typography>
                <TextField type="date" size="small" variant="outlined" disabled={!!layout.initialDateFollowsNow && !layout.isOverviewMode} value={layout.initialDate || ''} onChange={e => handleUpdate({ initialDate: (e.target as HTMLInputElement).value })} sx={{ width: '170px' }} />
                <FormControlLabel control={<Checkbox size="small" disabled={!!layout.isOverviewMode} checked={!!layout.initialDateFollowsNow} onChange={e => handleUpdate({ initialDateFollowsNow: e.target.checked })} />} label={<Typography noWrap>跟随今日</Typography>} />
            </Stack>
            <AlignedRadioGroup label="初始视图（时间窗）" options={PERIOD_OPTIONS} selectedValue={layout.initialView || '月'} onChange={(value: string) => handleUpdate({ initialView: value })} />
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
                
                {/* [CORE CHANGE] Replaced SimpleSelect with Autocomplete for adding views */}
                <Autocomplete
                    value={null} // Always reset after selection
                    options={availableViewOptions}
                    getOptionLabel={(option) => option.label || ''}
                    onChange={(_, newValue) => {
                        if (newValue) {
                            addView(newValue.value);
                        }
                    }}
                    renderInput={(params) => <TextField {...params} variant="outlined" placeholder="+ 搜索并添加视图..." />}
                    sx={{ minWidth: 150 }}
                    size="small"
                />
            </Stack>
        </Stack>
    );
}

export function LayoutSettings({ app, appStore }: { app: App, appStore: AppStore }) {
    const layouts = useStore(state => state.settings.layouts);
    const allGroups = useStore(state => state.settings.groups);
    const layoutGroups = useMemo(() => allGroups.filter(g => g.type === 'layout'), [allGroups]);

    const manager = useSettingsManager({ app, appStore, type: 'layout', itemNoun: '布局' });

    const itemsAsTreeItems: TreeItem[] = useMemo(() => layouts.map(l => ({
        ...l,
        name: l.name,
        isGroup: false,
    })), [layouts]);

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            const activeItem = itemsAsTreeItems.find(i => i.id === active.id) || layoutGroups.find(g => g.id === active.id);
            const overItem = itemsAsTreeItems.find(i => i.id === over.id) || layoutGroups.find(g => g.id === over.id);

            if (activeItem && overItem && activeItem.parentId === overItem.parentId) {
                const siblings = [...layoutGroups, ...itemsAsTreeItems].filter(i => i.parentId === activeItem.parentId);
                const oldIndex = siblings.findIndex(i => i.id === active.id);
                const newIndex = siblings.findIndex(i => i.id === over.id);

                if (oldIndex !== -1 && newIndex !== -1) {
                    const reorderedSiblings = arrayMove(siblings, oldIndex, newIndex);
                    appStore.reorderItems(reorderedSiblings, activeItem.isGroup ? 'group' : 'layout');
                }
            }
        }
    };

    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Typography variant="h6">管理布局</Typography>
            </Stack>

            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SettingsTreeView
                    groups={layoutGroups}
                    items={itemsAsTreeItems}
                    allGroups={layoutGroups}
                    parentId={null}
                    appStore={appStore}
                    renderItem={(l: Layout) => <LayoutEditor layout={l} appStore={appStore} />}
                    onAddItem={manager.onAddItem}
                    onAddGroup={manager.onAddGroup}
                    onDeleteItem={manager.onDeleteItem}
                    onUpdateItemName={manager.onUpdateItemName}
                    onMoveItem={manager.onMoveItem}
                    onDuplicateItem={manager.onDuplicateItem}
                />
            </DndContext>
        </Box>
    );
}
