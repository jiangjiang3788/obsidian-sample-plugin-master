// src/core/settings/ui/ViewInstanceSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { Box, Stack, Typography, TextField, FormControlLabel, Checkbox, Tooltip, Chip } from '@mui/material';
import { DEFAULT_NAMES } from '@core/domain/constants';
import { VIEW_OPTIONS, ViewName, getAllFields } from '@core/domain/schema';
import type { ViewInstance } from '@core/domain/schema';
import { VIEW_EDITORS } from '@features/dashboard/settings/ModuleEditors/registry';
import { DataStore } from '@core/services/dataStore';
import { useMemo } from 'preact/hooks';
import { SimpleSelect } from '@shared/ui/SimpleSelect';
import { SettingsTreeView, TreeItem } from './components/SettingsTreeView';
import { NamePromptModal } from '@shared/components/dialogs/NamePromptModal';
import { App } from 'obsidian';

const LABEL_WIDTH = '80px';

// ... ViewInstanceEditor 组件无变化 ...
function ViewInstanceEditor({ vi }: { vi: ViewInstance }) {
    // ...
}

// [架构修正] 组件接收 app prop
export function ViewInstanceSettings({ app }: { app: App }) {
    const viewInstances = useStore(state => state.settings.viewInstances);
    const allGroups = useStore(state => state.settings.groups);
    const viewGroups = useMemo(() => allGroups.filter(g => g.type === 'viewInstance'), [allGroups]);
    const itemsAsTreeItems: TreeItem[] = useMemo(() => viewInstances.map(vi => ({
        ...vi,
        name: vi.title, 
        isGroup: false,
    })), [viewInstances]);

    // [架构修正] 使用传入的 app prop，而不是全局单例
    const handleAddItem = (parentId: string | null) => {
        new NamePromptModal(
            app,
            "创建新视图",
            "请输入新视图标题...",
            DEFAULT_NAMES.NEW_VIEW,
            (newName) => AppStore.instance.addViewInstance(newName, parentId)
        ).open();
    };
    const handleAddGroup = (parentId: string | null) => {
        new NamePromptModal(
            app,
            "创建新分组",
            "请输入分组名称...",
            "新分组",
            (newName) => AppStore.instance.addGroup(newName, parentId, 'viewInstance')
        ).open();
    };
    const handleDeleteItem = (item: TreeItem) => {
        const confirmText = item.isGroup
            ? `确认删除分组 "${item.name}" 吗？\n其内部所有内容将被移至上一级。`
            : `确认删除视图 "${item.name}" 吗？\n布局中对该视图的引用将被移除。`;
        if (confirm(confirmText)) {
            if (item.isGroup) {
                AppStore.instance.deleteGroup(item.id);
            } else {
                AppStore.instance.deleteViewInstance(item.id);
            }
        }
    };
    const handleUpdateItemName = (item: TreeItem, newName: string) => {
        if (item.isGroup) {
            AppStore.instance.updateGroup(item.id, { name: newName });
        } else {
            AppStore.instance.updateViewInstance(item.id, { title: newName });
        }
    };
    
    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Typography variant="h6">管理视图</Typography>
            </Stack>
            
            <SettingsTreeView
                groups={viewGroups}
                items={itemsAsTreeItems}
                allGroups={viewGroups}
                parentId={null}
                renderItem={(vi: ViewInstance) => <ViewInstanceEditor vi={vi} />}
                onAddItem={handleAddItem}
                onAddGroup={handleAddGroup}
                onDeleteItem={handleDeleteItem}
                onUpdateItemName={handleUpdateItemName}
            />
        </Box>
    );
}