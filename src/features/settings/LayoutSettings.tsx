// src/features/settings/ui/LayoutSettings.tsx
/** @jsxImportSource preact */
/**
 * LayoutSettings - 布局设置页面
 * 
 * 【S5 术语统一】
 * - 所有 Layout 和 View 写操作统一通过 useCases.layout.*
 * - 禁止直接调用 useCases.viewInstance.*
 * - 禁止直接调用 store slice 的 CRUD/reorder
 * 
 * 【已禁用】Group 功能
 * - 不再渲染/引用任何 group 组件
 * - 不再调用 useCases.group.*
 * - Layout/View 作为扁平列表管理
 */
import { h } from 'preact';
import { useZustandAppStore, useUseCases } from '@/app/AppStoreContext';
import type { UseCases } from '@/app/usecases';
import { Box, Stack, Typography, TextField, Checkbox, FormControlLabel, Tooltip, Chip, Radio, RadioGroup as MuiRadioGroup, Autocomplete, Button, Menu, MenuItem, IconButton } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { Layout, ViewInstance } from '@/core/types/schema';
import { useMemo, useCallback, useState } from 'preact/hooks';
import { App } from 'obsidian';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { arrayMove } from '@core/utils/array';
import { ModuleSettingsModal } from '@/features/settings/ModuleSettingsModal';
import { NamePromptModal } from '@shared/ui/composites/dialogs/NamePromptModal';
import { DEFAULT_NAMES } from '@/core/types/constants';

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

// Layout 编辑器组件
function LayoutEditor({ layout, useCases }: { layout: Layout, useCases: UseCases }) {
    const allViews = useZustandAppStore(state => state.settings.viewInstances);
    const [inputValue, setInputValue] = useState('');
    const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; viewId: string; viewTitle: string } | null>(null);
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);
    const [selectedViewForSettings, setSelectedViewForSettings] = useState<ViewInstance | null>(null);

    const handleUpdate = useCallback((updates: Partial<Layout>) => {
        useCases.layout.updateLayout(layout.id, updates);
    }, [layout.id, useCases]);

    const selectedViews = useMemo(() =>
        layout.viewInstanceIds.map(id => allViews.find(v => v.id === id)).filter(Boolean) as ViewInstance[],
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
            // S5 术语统一: 通过 useCases.layout.addView 创建
            await useCases.layout.addView(viewName);
            setInputValue('');
        } catch (error) {
            console.error('创建新视图失败:', error);
        }
    }, [useCases, addView]);

    const handleAutocompleteChange = useCallback(async (event: any, newValue: any) => {
        if (!newValue) return;
        
        if (newValue.type === 'existing') {
            addView(newValue.value);
        } else if (newValue.type === 'create') {
            await handleCreateNewView(newValue.newName);
        }
        
        setInputValue('');
    }, [addView, handleCreateNewView]);

    // 右键菜单处理
    const handleChipRightClick = useCallback((event: MouseEvent, view: ViewInstance) => {
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
                // 迁移: 使用 useCases.viewInstance.updateView 更新视图元数据
                useCases.viewInstance.updateView(contextMenu.viewId, { title: newName.trim() });
            }
        }
        handleContextMenuClose();
    }, [contextMenu, useCases, handleContextMenuClose]);

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
                
                <Autocomplete
                    value={null}
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

            {settingsModalOpen && selectedViewForSettings && (
                <ModuleSettingsModal
                    isOpen={settingsModalOpen}
                    onClose={handleSettingsModalClose}
                    module={selectedViewForSettings}
                />
            )}
        </Stack>
    );
}

// 可排序的 Layout 项
function SortableLayoutItem({ layout, useCases, isExpanded, onToggle }: { 
    layout: Layout; 
    useCases: UseCases; 
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: layout.id });

    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
    };

    const handleDelete = useCallback(() => {
        if (confirm(`确认删除布局 "${layout.name}" 吗？\n相关的引用可能会失效。`)) {
            useCases.layout.deleteLayout(layout.id);
        }
    }, [layout, useCases]);

    const handleDuplicate = useCallback(() => {
        useCases.layout.duplicateLayout(layout.id);
    }, [layout.id, useCases]);

    const handleRename = useCallback(() => {
        const newName = prompt('请输入新的布局名称', layout.name);
        if (newName && newName.trim()) {
            useCases.layout.updateLayout(layout.id, { name: newName.trim() });
        }
    }, [layout, useCases]);

    // 提取 dnd-kit 属性，避免类型冲突（使用类型断言处理 Preact 兼容性）
    const dragHandleProps = { ...attributes, ...listeners } as any;

    return (
        <Box ref={setNodeRef as any} style={style} sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            <Stack direction="row" alignItems="center" sx={{ p: 1 }}>
                <div 
                    {...dragHandleProps}
                    style={{ 
                        cursor: 'grab', 
                        marginRight: 8, 
                        display: 'inline-flex', 
                        alignItems: 'center',
                        padding: 4,
                        borderRadius: 4
                    }}
                >
                    <DragIndicatorIcon fontSize="small" />
                </div>
                
                <IconButton size="small" onClick={onToggle} sx={{ mr: 1 }}>
                    {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>

                <Typography 
                    sx={{ flex: 1, cursor: 'pointer' }} 
                    onClick={handleRename}
                >
                    {layout.name}
                </Typography>

                <Tooltip title="复制">
                    <IconButton size="small" onClick={handleDuplicate}>
                        <ContentCopyIcon fontSize="small" />
                    </IconButton>
                </Tooltip>

                <Tooltip title="删除">
                    <IconButton size="small" onClick={handleDelete} color="error">
                        <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Stack>

            {isExpanded && (
                <LayoutEditor layout={layout} useCases={useCases} />
            )}
        </Box>
    );
}

/**
 * LayoutSettings - 布局设置主组件
 * 
 * 【已禁用】Group 功能
 * - 不再使用 SettingsTreeView（包含 group 逻辑）
 * - 使用扁平 Layout 列表 + 拖拽排序
 */
export function LayoutSettings({ app }: { app: App }) {
    const useCases = useUseCases();
    const layouts = useZustandAppStore(state => state.settings.layouts);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // 添加新布局（无 parentId，扁平列表）
    const onAddLayout = useCallback(() => {
        new NamePromptModal(
            app,
            `创建新布局`,
            `请输入新布局的名称...`,
            DEFAULT_NAMES.NEW_LAYOUT,
            (newName) => {
                // S5: 通过 useCases.layout 创建，parentId = null
                useCases.layout.addLayout(newName, null);
            }
        ).open();
    }, [app, useCases]);

    const toggleExpand = useCallback((id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    // 拖拽排序处理（扁平列表，无 group）
    const handleDragEnd = useCallback((event: any) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            const oldIndex = layouts.findIndex(l => l.id === active.id);
            const newIndex = layouts.findIndex(l => l.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const reorderedLayouts = arrayMove(layouts, oldIndex, newIndex);
                const orderedIds = reorderedLayouts.map(l => l.id);
                // S5: 通过 useCases.layout.reorderLayouts 排序
                useCases.layout.reorderLayouts(orderedIds);
            }
        }
    }, [layouts, useCases]);

    const layoutIds = useMemo(() => layouts.map(l => l.id), [layouts]);

    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6">管理布局</Typography>
                <Button 
                    onClick={onAddLayout} 
                    startIcon={<AddCircleOutlineIcon />} 
                    variant="outlined"
                    size="small"
                >
                    添加布局
                </Button>
            </Stack>

            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={layoutIds} strategy={verticalListSortingStrategy}>
                    {layouts.map(layout => (
                        <SortableLayoutItem
                            key={layout.id}
                            layout={layout}
                            useCases={useCases}
                            isExpanded={expandedIds.has(layout.id)}
                            onToggle={() => toggleExpand(layout.id)}
                        />
                    ))}
                </SortableContext>
            </DndContext>

            {layouts.length === 0 && (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    暂无布局，点击"添加布局"创建第一个
                </Typography>
            )}
        </Box>
    );
}
