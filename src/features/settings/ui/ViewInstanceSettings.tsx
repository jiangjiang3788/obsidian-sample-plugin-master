// src/features/settings/ui/ViewInstanceSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { Box, Stack, Typography, FormControlLabel, Checkbox, Tooltip, Chip } from '@mui/material';
import { VIEW_OPTIONS, ViewName, getAllFields } from '@core/domain/schema';
import type { ViewInstance } from '@core/domain/schema';
import { VIEW_EDITORS } from './components/view-editors/registry';
import { DataStore } from '@core/services/dataStore';
import { useMemo } from 'preact/hooks';
import { SimpleSelect } from '@shared/ui/SimpleSelect';
import { SettingsTreeView, TreeItem } from './components/SettingsTreeView';
import { App } from 'obsidian';
import { useSettingsManager } from './hooks/useSettingsManager';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove } from '@core/utils/array';

const LABEL_WIDTH = '80px';

function ViewInstanceEditor({ vi, appStore }: { vi: ViewInstance, appStore: AppStore }) {
    const dataSources = useStore(state => state.settings.dataSources);
    const fieldOptions = useMemo(() => getAllFields(DataStore.instance?.queryItems() || []), []);
    const EditorComponent = VIEW_EDITORS[vi.viewType];
    
    const correctedViewConfig = useMemo(() => {
        if (vi.viewConfig && typeof (vi.viewConfig as any).categories === 'object') return vi.viewConfig;
        if (vi.viewConfig && (vi.viewConfig as any).viewConfig) return (vi.viewConfig as any).viewConfig;
        return vi.viewConfig || {};
    }, [vi.viewConfig]);

    const handleUpdate = (updates: Partial<ViewInstance>) => {
        appStore.updateViewInstance(vi.id, updates);
    };
    
    const addField = (field: string) => {
        if (field && !vi.fields?.includes(field)) {
            handleUpdate({ fields: [...(vi.fields || []), field] });
        }
    };

    const removeField = (field: string) => {
        handleUpdate({ fields: vi.fields?.filter(f => f !== field) });
    };

    const viewTypeOptions = VIEW_OPTIONS.map(v => ({ value: v, label: v.replace('View', '') }));
    const dataSourceOptions = dataSources.map(ds => ({ value: ds.id, label: ds.name }));
    const availableFieldOptions = fieldOptions.filter(f => !vi.fields?.includes(f)).map(f => ({ value: f, label: f }));
    
    const groupFieldOptions = useMemo(() => [
        { value: '', label: '-- 不分组 --' },
        ...fieldOptions.map(f => ({ value: f, label: f }))
    ], [fieldOptions]);

    return (
        <Stack spacing={2} sx={{ p: '8px 16px 16px 50px' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>基础配置</Typography>
                <SimpleSelect value={vi.viewType} options={viewTypeOptions} onChange={val => handleUpdate({ viewType: val as ViewName })} sx={{ minWidth: 150, flexGrow: 1 }} />
                <SimpleSelect value={vi.dataSourceId} options={dataSourceOptions} placeholder="-- 选择数据源 --" onChange={val => handleUpdate({ dataSourceId: val })} sx={{ minWidth: 150, flexGrow: 1 }} />
                <FormControlLabel control={<Checkbox size="small" checked={!!vi.collapsed} onChange={e => handleUpdate({ collapsed: e.target.checked })} />} label={<Typography noWrap>默认折叠</Typography>} />
            </Stack>
            <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap alignItems="center">
                <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>显示字段</Typography>
                {(vi.fields || []).map(field => (
                    <Tooltip key={field} title={`点击移除字段: ${field}`}>
                        <Chip label={field} onClick={() => removeField(field)} size="small" />
                    </Tooltip>
                ))}
                <SimpleSelect value="" options={availableFieldOptions} placeholder="+ 添加字段..." onChange={val => addField(val)} sx={{ minWidth: 150 }} />
            </Stack>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>分组字段</Typography>
                <SimpleSelect fullWidth value={vi.group || ''} options={groupFieldOptions} onChange={val => handleUpdate({ group: val || undefined })} />
            </Stack>
            {EditorComponent && (
                <Box pt={1} mt={1} sx={{borderTop: '1px solid rgba(0,0,0,0.08)'}}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, mt: 1 }}>{vi.viewType.replace('View','')} 专属配置</Typography>
                    <EditorComponent module={vi} value={correctedViewConfig} onChange={(patch: any) => handleUpdate({ viewConfig: { ...correctedViewConfig, ...patch } })} fieldOptions={fieldOptions} />
                </Box>
            )}
        </Stack>
    );
}

export function ViewInstanceSettings({ app, appStore }: { app: App, appStore: AppStore }) {
    const viewInstances = useStore(state => state.settings.viewInstances);
    const allGroups = useStore(state => state.settings.groups);
    const viewGroups = useMemo(() => allGroups.filter(g => g.type === 'viewInstance'), [allGroups]);
    const manager = useSettingsManager({ app, appStore, type: 'viewInstance', itemNoun: '视图' });

    const itemsAsTreeItems: TreeItem[] = useMemo(() => viewInstances.map(vi => ({
        ...vi,
        name: vi.title, 
        isGroup: false,
    })), [viewInstances]);

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            const activeItem = itemsAsTreeItems.find(i => i.id === active.id) || viewGroups.find(g => g.id === active.id);
            const overItem = itemsAsTreeItems.find(i => i.id === over.id) || viewGroups.find(g => g.id === over.id);

            if (activeItem && overItem && activeItem.parentId === overItem.parentId) {
                const siblings = [...viewGroups, ...itemsAsTreeItems].filter(i => i.parentId === activeItem.parentId);
                const oldIndex = siblings.findIndex(i => i.id === active.id);
                const newIndex = siblings.findIndex(i => i.id === over.id);
                
                if (oldIndex !== -1 && newIndex !== -1) {
                    const reorderedSiblings = arrayMove(siblings, oldIndex, newIndex);
                    appStore.reorderItems(reorderedSiblings, activeItem.isGroup ? 'group' : 'viewInstance');
                }
            }
        }
    };

    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Typography variant="h6">管理视图</Typography>
            </Stack>
            
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SettingsTreeView
                    groups={viewGroups}
                    items={itemsAsTreeItems}
                    allGroups={viewGroups}
                    parentId={null}
                    renderItem={(vi: ViewInstance) => <ViewInstanceEditor vi={vi} appStore={appStore} />}
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