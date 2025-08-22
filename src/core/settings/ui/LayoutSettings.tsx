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

// ... LayoutEditor 和 AlignedRadioGroup 组件无变化 ...
const PERIOD_OPTIONS = ['年', '季', '月', '周', '天'].map(v => ({ value: v, label: v }));
const DISPLAY_MODE_OPTIONS = [{ value: 'list', label: '列表' }, { value: 'grid', label: '网格' }];
const LABEL_WIDTH = '80px';
const AlignedRadioGroup = ({ label, options, selectedValue, onChange }: any) => {
    // ...
};
function LayoutEditor({ layout }: { layout: Layout }) {
    // ...
}

// [架构修正] 组件接收 app prop
export function LayoutSettings({ app }: { app: App }) {
    const layouts = useStore(state => state.settings.layouts);
    const allGroups = useStore(state => state.settings.groups);
    const layoutGroups = useMemo(() => allGroups.filter(g => g.type === 'layout'), [allGroups]);
    const itemsAsTreeItems: TreeItem[] = useMemo(() => layouts.map(l => ({
        ...l,
        name: l.name,
        isGroup: false,
    })), [layouts]);

    // [架构修正] 使用传入的 app prop，而不是全局单例
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
            />
        </Box>
    );
}