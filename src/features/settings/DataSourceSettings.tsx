// src/features/settings/ui/DataSourceSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@core/stores/AppStore';
import { Typography, Stack, Box } from '@mui/material';
import { getAllFields } from '@/core/types/schema';
// [修改] 从注册表导入 dataStore
import { dataStore } from '@core/stores/storeRegistry../../store/storeRegistry';
import { useMemo } from 'preact/hooks';
import type { DataSource } from '@/core/types/schema';
import { RuleBuilder } from './components/RuleBuilder';
import { SettingsTreeView, TreeItem } from './components/SettingsTreeView';
import { App } from 'obsidian';
import { useSettingsManager } from './hooks/useSettingsManager';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove } from '@core/utils/array';

// [修改] 组件 props 现在需要接收 appStore
function DataSourceEditor({ ds, appStore }: { ds: DataSource, appStore: AppStore }) {
    const fieldOptions = useMemo(() => {
        // [修复] 直接使用从注册表导入的 dataStore 实例
        const currentDataStore = dataStore;
        if (!currentDataStore) return [];
        const allItems = currentDataStore.queryItems();
        return getAllFields(allItems);
    }, []);

    const handleUpdate = (updates: Partial<DataSource>) => {
        // [修改] 使用传入的 appStore 实例
        appStore.updateDataSource(ds.id, updates);
    };

    return (
        <Stack spacing={2} sx={{p: '8px 16px 16px 50px'}}>
            <RuleBuilder title="过滤规则" mode="filter" rows={ds.filters} fieldOptions={fieldOptions} onChange={(rows: any) => handleUpdate({ filters: rows })} />
            <RuleBuilder title="排序规则" mode="sort" rows={ds.sort} fieldOptions={fieldOptions} onChange={(rows: any) => handleUpdate({ sort: rows })} />
        </Stack>
    );
}

// [修改] 组件 props 现在需要接收 appStore
export function DataSourceSettings({ app, appStore }: { app: App, appStore: AppStore }) {
    const dataSources = useStore(state => state.settings.dataSources);
    const allGroups = useStore(state => state.settings.groups);
    const dsGroups = useMemo(() => allGroups.filter(g => g.type === 'dataSource'), [allGroups]);

    // [修改] 将 appStore 传递给 manager hook
    const manager = useSettingsManager({ app, appStore, type: 'dataSource', itemNoun: '数据源' });

    const itemsAsTreeItems: TreeItem[] = useMemo(() => dataSources.map(ds => ({
        ...ds,
        name: ds.name,
        isGroup: false,
    })), [dataSources]);
    
    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            const activeItem = itemsAsTreeItems.find(i => i.id === active.id) || dsGroups.find(g => g.id === active.id);
            const overItem = itemsAsTreeItems.find(i => i.id === over.id) || dsGroups.find(g => g.id === over.id);

            // Only allow reordering among siblings
            if (activeItem && overItem && activeItem.parentId === overItem.parentId) {
                const siblings = [...dsGroups, ...itemsAsTreeItems].filter(i => i.parentId === activeItem.parentId);
                const oldIndex = siblings.findIndex(i => i.id === active.id);
                const newIndex = siblings.findIndex(i => i.id === over.id);
                
                if (oldIndex !== -1 && newIndex !== -1) {
                    const reorderedSiblings = arrayMove(siblings, oldIndex, newIndex);
                    
                    // Update store with the full reordered list for this type
                    // [修复] 使用 appStore 实例
                    appStore.reorderItems(reorderedSiblings, activeItem.isGroup ? 'group' : 'dataSource');
                }
            }
        }
    };

    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Typography variant="h6">管理数据源</Typography>
            </Stack>
            
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SettingsTreeView
                    groups={dsGroups}
                    items={itemsAsTreeItems}
                    allGroups={dsGroups}
                    parentId={null}
                    // [修改] 在此将 appStore 实例传递给 SettingsTreeView
                    appStore={appStore}
                    // [修改] 渲染子项时传入 appStore
                    renderItem={(ds: DataSource) => <DataSourceEditor ds={ds} appStore={appStore} />}
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