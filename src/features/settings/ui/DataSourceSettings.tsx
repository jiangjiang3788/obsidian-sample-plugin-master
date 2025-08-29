// src/features/settings/ui/DataSourceSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore , AppStore} from '@state/AppStore';
import { Typography, Stack, Box } from '@mui/material';
import { getAllFields } from '@core/domain/schema';
import { DataStore } from '@core/services/dataStore';
import { useMemo } from 'preact/hooks';
import type { DataSource } from '@core/domain/schema';
import { RuleBuilder } from './components/RuleBuilder';
import { SettingsTreeView, TreeItem } from './components/SettingsTreeView';
import { App } from 'obsidian';
import { useSettingsManager } from './hooks/useSettingsManager';
// [NEW] Import dnd-kit and the arrayMove utility
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove } from '@core/utils/array';

function DataSourceEditor({ ds }: { ds: DataSource }) {
    const fieldOptions = useMemo(() => {
        const allItems = DataStore.instance.queryItems();
        return getAllFields(allItems);
    }, []);

    const handleUpdate = (updates: Partial<DataSource>) => {
        AppStore.instance.updateDataSource(ds.id, updates);
    };

    return (
        <Stack spacing={2} sx={{p: '8px 16px 16px 50px'}}>
            <RuleBuilder title="过滤规则" mode="filter" rows={ds.filters} fieldOptions={fieldOptions} onChange={(rows: any) => handleUpdate({ filters: rows })} />
            <RuleBuilder title="排序规则" mode="sort" rows={ds.sort} fieldOptions={fieldOptions} onChange={(rows: any) => handleUpdate({ sort: rows })} />
        </Stack>
    );
}

export function DataSourceSettings({ app }: { app: App }) {
    const dataSources = useStore(state => state.settings.dataSources);
    const allGroups = useStore(state => state.settings.groups);
    const dsGroups = useMemo(() => allGroups.filter(g => g.type === 'dataSource'), [allGroups]);

    const manager = useSettingsManager({ app, type: 'dataSource', itemNoun: '数据源' });

    const itemsAsTreeItems: TreeItem[] = useMemo(() => dataSources.map(ds => ({
        ...ds,
        name: ds.name,
        isGroup: false,
    })), [dataSources]);
    
    // [NEW] Drag end handler
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
                    AppStore.instance.reorderItems(reorderedSiblings, activeItem.isGroup ? 'group' : 'dataSource');
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
                    renderItem={(ds: DataSource) => <DataSourceEditor ds={ds} />}
                    onAddItem={manager.onAddItem}
                    onAddGroup={manager.onAddGroup}
                    onDeleteItem={manager.onDeleteItem}
                    onUpdateItemName={manager.onUpdateItemName}
                    onMoveItem={manager.onMoveItem} // This is for up/down arrows, can be kept
                    onDuplicateItem={manager.onDuplicateItem}
                />
            </DndContext>
        </Box>
    );
}