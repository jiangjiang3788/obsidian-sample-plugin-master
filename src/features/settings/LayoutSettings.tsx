// src/features/settings/ui/LayoutSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@/app/AppStore';
// [MODIFIED] Import Autocomplete
import { Box, Stack, Typography, TextField, Checkbox, FormControlLabel, Tooltip, Chip, Radio, RadioGroup as MuiRadioGroup, Autocomplete, Button, Menu, MenuItem } from '@mui/material';
import type { Layout } from '@/core/types/schema';
import { useMemo, useCallback, useState } from 'preact/hooks';
import { SimpleSelect } from '@shared/ui/composites/SimpleSelect';
import { SettingsTreeView, TreeItem } from './SettingsTreeView';
import { App } from 'obsidian';
import { useSettingsManager } from './useSettingsManager';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove } from '@core/utils/array';
import { ModuleSettingsModal } from '@features/dashboard/ModuleSettingsModal';

const PERIOD_OPTIONS = ['年', '季', '月', '周', '天'].map(v => ({ value: v, label: v }));
const DISPLAY_MODE_OPTIONS = [{ value: 'list', label: '列表' }, { value: 'grid', label: '网格' }];
const LABEL_WIDTH = '80px';

const AlignedRadioGroup = ({ label, options, selectedValue, onChange }: any) => (
    <Stack direction="row" alignItems="center" spacing={2}>
        <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>{label}</Typography>
        <MuiRadioGroup row value={selectedValue} onChange={(e) => onChange((e.target as HTMLInputElement).value)}>
            {options.map((opt: any) => (
                <FormControlLabel key={opt.value} value={opt.value} control={<Radio size="small" />} label={opt.label} />
            ))}
        </MuiRadioGroup>
    </Stack>
);

function LayoutEditor({ layout, appStore }: { layout: Layout, appStore: AppStore }) {
    const allViews = useStore(state => state.settings.viewInstances);
    const [inputValue, setInputValue] = useState('');
    const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; viewId: string; viewTitle: string } | null>(null);
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);
    const [selectedViewForSettings, setSelectedViewForSettings] = useState<any>(null);

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

    // 动态生成选项列表
    const autocompleteOptions = useMemo(() => {
        const existingOptions: Array<{value: string, label: string, type: 'existing' | 'create', newName?: string}> = availableViews.map(v => ({
            value: v.id,
            label: v.title,
            type: 'existing'
        }));

        // 如果用户有输入且不匹配任何现有视图，添加创建选项
        if (inputValue.trim() && !availableViews.some(v => 
            v.title.toLowerCase().includes(inputValue.toLowerCase())
        )) {
            existingOptions.push({
                value: 'create',
                label: `+ 创建新视图："${inputValue.trim()}"`,
                type: 'create',
                newName: inputValue.trim()
            });
        }

        return existingOptions;
    }, [availableViews, inputValue]);

    const handleCreateNewView = useCallback(async (viewName: string) => {
        try {
            await appStore.addViewInstance(viewName);
            setInputValue(''); // 清空输入
        } catch (error) {
            console.error('创建新视图失败:', error);
        }
    }, [appStore]);

    const handleAutocompleteChange = useCallback(async (event: any, newValue: any) => {
        if (!newValue) return;
        
        if (newValue.type === 'existing') {
            addView(newValue.value);
        } else if (newValue.type === 'create') {
            await handleCreateNewView(newValue.newName);
        }
        
        setInputValue(''); // 重置输入
    }, [addView, handleCreateNewView]);

    // 右键菜单处理
    const handleChipRightClick = useCallback((event: MouseEvent, view: any) => {
        event.preventDefault();
        setContextMenu({
            mouseX: event.clientX - 2,
            mouseY: event.clientY - 4,
            viewId: view.id,
            viewTitle: view.title
        });
    }, []);

    const handleContextMenuClose = useCallback(() => {
        setContextMenu(null);
    }, []);

    const handleViewSettings = useCallback(() => {
        if (contextMenu) {
            const view = allViews.find(v => v.id === contextMenu.viewId);
            if (view) {
                setSelectedViewForSettings(view);
                setSettingsModalOpen(true);
            }
        }
        handleContextMenuClose();
    }, [contextMenu, allViews, handleContextMenuClose]);

    const handleViewRename = useCallback(() => {
        if (contextMenu) {
            const newName = prompt('请输入新的视图名称', contextMenu.viewTitle);
            if (newName && newName.trim()) {
                appStore.updateViewInstance(contextMenu.viewId, { title: newName.trim() });
            }
        }
        handleContextMenuClose();
    }, [contextMenu, appStore, handleContextMenuClose]);

    const handleViewRemove = useCallback(() => {
        if (contextMenu) {
            removeView(contextMenu.viewId);
        }
        handleContextMenuClose();
    }, [contextMenu, removeView, handleContextMenuClose]);

    const handleSettingsModalClose = useCallback(() => {
        setSettingsModalOpen(false);
        setSelectedViewForSettings(null);
    }, []);

    return (
        <Stack spacing={2} sx={{ p: '8px 16px 16px 50px' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>工具栏</Typography>
                <FormControlLabel control={<Checkbox size="small" checked={!layout.hideToolbar} onChange={e => handleUpdate({ hideToolbar: !(e.target as HTMLInputElement).checked })} />} label={<Typography noWrap>显示工具栏/导航器</Typography>} sx={{ flexShrink: 0, mr: 0 }} />
            </Stack>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>初始日期</Typography>
                <TextField type="date" size="small" variant="outlined" disabled={!!layout.initialDateFollowsNow} value={layout.initialDate || ''} onChange={e => handleUpdate({ initialDate: (e.target as HTMLInputElement).value })} sx={{ width: '170px' }} />
                <FormControlLabel control={<Checkbox size="small" checked={!!layout.initialDateFollowsNow} onChange={e => handleUpdate({ initialDateFollowsNow: (e.target as HTMLInputElement).checked })} />} label={<Typography noWrap>跟随今日</Typography>} />
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
                {selectedViews.map(view => view && (
                    <Tooltip key={view.id} title={`左键移除，右键更多选项`}>
                        <Chip 
                            label={view.title} 
                            onClick={() => removeView(view.id)} 
                            onContextMenu={(e) => handleChipRightClick(e, view)}
                            size="small" 
                            sx={{ cursor: 'pointer' }}
                        />
                    </Tooltip>
                ))}
                
                {/* [CORE CHANGE] Enhanced Autocomplete for adding/creating views */}
                <Autocomplete
                    value={null} // Always reset after selection
                    inputValue={inputValue}
                    onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
                    options={autocompleteOptions}
                    getOptionLabel={(option) => option ? option.label : ''}
                    onChange={handleAutocompleteChange}
                    renderInput={(params) => <TextField {...params as any} variant="outlined" placeholder="+ 搜索添加或创建视图..." />}
                    sx={{ minWidth: 200 }}
                    size="small"
                />
            </Stack>

            {/* 右键上下文菜单 */}
            <Menu
                open={contextMenu !== null}
                onClose={handleContextMenuClose}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu !== null
                        ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                        : undefined
                }
            >
                <MenuItem onClick={handleViewSettings}>设置视图</MenuItem>
                <MenuItem onClick={handleViewRename}>重命名</MenuItem>
                <MenuItem onClick={handleViewRemove}>移除</MenuItem>
            </Menu>

            {/* 视图设置模态框 */}
            {settingsModalOpen && selectedViewForSettings && (
                <ModuleSettingsModal
                    isOpen={settingsModalOpen}
                    onClose={handleSettingsModalClose}
                    module={selectedViewForSettings}
                    appStore={appStore}
                />
            )}
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
                    appStore.reorderItems(reorderedSiblings, 'isGroup' in activeItem && activeItem.isGroup ? 'group' : 'layout');
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
