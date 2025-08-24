// src/core/settings/ui/LayoutSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { Box, Stack, Typography, TextField, Checkbox, FormControlLabel, Tooltip, Chip, Radio, RadioGroup as MuiRadioGroup } from '@mui/material';
import { DEFAULT_NAMES } from '@core/domain/constants';
import type { Layout } from '@core/domain/schema';
import { useMemo, useCallback } from 'preact/hooks';
import { SimpleSelect } from '@shared/ui/SimpleSelect';
import { SettingsTreeView, TreeItem } from './components/SettingsTreeView';
import { DataStore } from '@core/services/dataStore';
import { NamePromptModal } from '@shared/components/dialogs/NamePromptModal';
import { App } from 'obsidian';

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

function LayoutEditor({ layout }: { layout: Layout }) {
    const allViews = useStore(state => state.settings.viewInstances);

    const handleUpdate = useCallback((updates: Partial<Layout>) => {
        AppStore.instance.updateLayout(layout.id, updates);
    }, [layout.id]);

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
                <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>工具栏</Typography>
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
                <SimpleSelect value="" options={availableViewOptions} onChange={addView} placeholder="+ 添加视图..." sx={{ minWidth: 150 }} />
            </Stack>
        </Stack>
    );
}


export function LayoutSettings({ app }: { app: App }) {
    const layouts = useStore(state => state.settings.layouts);
    const allGroups = useStore(state => state.settings.groups);
    const layoutGroups = useMemo(() => allGroups.filter(g => g.type === 'layout'), [allGroups]);
    const itemsAsTreeItems: TreeItem[] = useMemo(() => layouts.map(l => ({
        ...l,
        name: l.name,
        isGroup: false,
    })), [layouts]);

    const handleAddItem = (parentId: string | null) => {
        new NamePromptModal(
            app,
            "创建新布局",
            "请输入新布局名称...",
            DEFAULT_NAMES.NEW_LAYOUT,
            (newName) => AppStore.instance.addLayout(newName, parentId)
        ).open();
    };
    const handleAddGroup = (parentId: string | null) => {
        new NamePromptModal(
            app,
            "创建新分组",
            "请输入分组名称...",
            "新分组",
            (newName) => AppStore.instance.addGroup(newName, parentId, 'layout')
        ).open();
    };
    const handleDeleteItem = (item: TreeItem) => {
        const confirmText = item.isGroup
            ? `确认删除分组 "${item.name}" 吗？\n其内部所有内容将被移至上一级。`
            : `确认删除布局 "${item.name}" 吗？`;
        if (confirm(confirmText)) {
            if (item.isGroup) {
                AppStore.instance.deleteGroup(item.id);
            } else {
                AppStore.instance.deleteLayout(item.id);
            }
        }
    };
    const handleUpdateItemName = (item: TreeItem, newName: string) => {
        if (item.isGroup) {
            AppStore.instance.updateGroup(item.id, { name: newName });
        } else {
            AppStore.instance.updateLayout(item.id, { name: newName });
        }
    };
    
    const handleMoveItem = (item: TreeItem, direction: 'up' | 'down') => {
        if (!item.isGroup) {
            AppStore.instance.moveLayout(item.id, direction);
        }
    };

	// [核心修改] 允许复制分组
    const handleDuplicateItem = (item: TreeItem) => {
        if (item.isGroup) {
            AppStore.instance.duplicateGroup(item.id);
        } else {
            AppStore.instance.duplicateLayout(item.id);
        }
    };

    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Typography variant="h6">管理布局</Typography>
            </Stack>

            <SettingsTreeView
                groups={layoutGroups}
                items={itemsAsTreeItems}
                allGroups={layoutGroups}
                parentId={null}
                renderItem={(l: Layout) => <LayoutEditor layout={l} />}
                onAddItem={handleAddItem}
                onAddGroup={handleAddGroup}
                onDeleteItem={handleDeleteItem}
                onUpdateItemName={handleUpdateItemName}
                onMoveItem={handleMoveItem}
                onDuplicateItem={handleDuplicateItem}
            />
        </Box>
    );
}