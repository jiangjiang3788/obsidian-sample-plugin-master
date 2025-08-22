// src/core/settings/ui/DataSourceSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { DEFAULT_NAMES } from '@core/domain/constants';
import { Typography, Stack, Box } from '@mui/material';
import { getAllFields } from '@core/domain/schema';
import { DataStore } from '@core/services/dataStore';
import { useMemo } from 'preact/hooks';
import type { DataSource } from '@core/domain/schema';
import { RuleBuilder } from './components/RuleBuilder';
import { SettingsTreeView, TreeItem } from './components/SettingsTreeView';
import { NamePromptModal } from '@shared/components/dialogs/NamePromptModal';
import { App } from 'obsidian';

// ... DataSourceEditor 组件无变化 ...

function DataSourceEditor({ ds }: { ds: DataSource }) {
        const fieldOptions = useMemo(() => {
            const allItems = DataStore.instance.queryItems();
            return getAllFields(allItems);
        }, []);
        const [name, setName] = useState(ds.name);
    
        useEffect(() => {
            setName(ds.name);
        }, [ds]);
    
        const handleUpdate = (updates: Partial<DataSource>) => {
            AppStore.instance.updateDataSource(ds.id, updates);
        };
    
        const handleNameBlur = () => {
            if (name !== ds.name) {
                handleUpdate({ name: name });
            }
        };
    
        return (
            <Stack spacing={2} sx={{p: '8px 16px'}}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Typography sx={{ width: '80px', flexShrink: 0, fontWeight: 500 }}>名称</Typography>
                    <TextField variant="outlined" size="small" value={name} onChange={e => setName((e.target as HTMLInputElement).value)} onBlur={handleNameBlur} sx={{maxWidth: '400px'}} />
                </Stack>
                {/* [修改] 此处现在使用的是导入的 RuleBuilder 组件 */}
                <RuleBuilder title="过滤规则" mode="filter" rows={ds.filters} fieldOptions={fieldOptions} onChange={(rows: any) => handleUpdate({ filters: rows })} />
                <RuleBuilder title="排序规则" mode="sort" rows={ds.sort} fieldOptions={fieldOptions} onChange={(rows: any) => handleUpdate({ sort: rows })} />
            </Stack>
        );
    }
    

// [架构修正] 组件接收 app prop
export function DataSourceSettings({ app }: { app: App }) {
    const dataSources = useStore(state => state.settings.dataSources);
    const allGroups = useStore(state => state.settings.groups);
    const dsGroups = useMemo(() => allGroups.filter(g => g.type === 'dataSource'), [allGroups]);
    const itemsAsTreeItems: TreeItem[] = useMemo(() => dataSources.map(ds => ({
        ...ds,
        name: ds.name,
        isGroup: false,
    })), [dataSources]);

    // [架构修正] 使用传入的 app prop，而不是全局单例
    const handleAddItem = (parentId: string | null) => {
        new NamePromptModal(
            app,
            "创建新数据源",
            "请输入数据源名称...",
            DEFAULT_NAMES.NEW_DATASOURCE,
            (newName) => AppStore.instance.addDataSource(newName, parentId)
        ).open();
    };
    const handleAddGroup = (parentId: string | null) => {
        new NamePromptModal(
            app,
            "创建新分组",
            "请输入分组名称...",
            "新分组",
            (newName) => AppStore.instance.addGroup(newName, parentId, 'dataSource')
        ).open();
    };
    const handleDeleteItem = (item: TreeItem) => {
        const confirmText = item.isGroup
            ? `确认删除分组 "${item.name}" 吗？\n其内部所有内容将被移至上一级。`
            : `确认删除数据源 "${item.name}" 吗？\n引用此数据源的视图将失效。`;
        if (confirm(confirmText)) {
            if (item.isGroup) {
                AppStore.instance.deleteGroup(item.id);
            } else {
                AppStore.instance.deleteDataSource(item.id);
            }
        }
    };
    const handleUpdateItemName = (item: TreeItem, newName: string) => {
        if (item.isGroup) {
            AppStore.instance.updateGroup(item.id, { name: newName });
        } else {
            AppStore.instance.updateDataSource(item.id, { name: newName });
        }
    };

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
                onAddItem={handleAddItem}
                onAddGroup={handleAddGroup}
                onDeleteItem={handleDeleteItem}
                onUpdateItemName={handleUpdateItemName}
            />
        </Box>
    );
}