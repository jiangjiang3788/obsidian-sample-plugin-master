// src/core/settings/ui/DataSourceSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore } from '@state/AppStore';
import { Typography, Stack, Box } from '@mui/material';
import { getAllFields } from '@core/domain/schema';
import { DataStore } from '@core/services/dataStore';
import { useMemo } from 'preact/hooks';
import type { DataSource } from '@core/domain/schema';
import { RuleBuilder } from './components/RuleBuilder';
import { SettingsTreeView, TreeItem } from './components/SettingsTreeView';
import { App } from 'obsidian';
// [重构] 导入新的自定义 Hook
import { useSettingsManager } from './hooks/useSettingsManager';

// 这个内部编辑器组件保持不变
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

    // [重构] 使用一行 Hook 代替之前所有的 handle... 函数
    const manager = useSettingsManager({ app, type: 'dataSource', itemNoun: '数据源' });

    const itemsAsTreeItems: TreeItem[] = useMemo(() => dataSources.map(ds => ({
        ...ds,
        name: ds.name,
        isGroup: false,
    })), [dataSources]);

    // [重构] 所有的 handle... 函数都已被移除

    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Typography variant="h6">管理数据源</Typography>
            </Stack>
            
            <SettingsTreeView
                groups={dsGroups}
                items={itemsAsTreeItems}
                allGroups={dsGroups}
                parentId={null}
                renderItem={(ds: DataSource) => <DataSourceEditor ds={ds} />}
                // [重构] 直接将 manager 中的函数传递给 props
                onAddItem={manager.onAddItem}
                onAddGroup={manager.onAddGroup}
                onDeleteItem={manager.onDeleteItem}
                onUpdateItemName={manager.onUpdateItemName}
                onMoveItem={manager.onMoveItem}
                onDuplicateItem={manager.onDuplicateItem}
            />
        </Box>
    );
}