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

function ViewInstanceEditor({ vi }: { vi: ViewInstance }) {
    const dataSources = useStore(state => state.settings.dataSources);
    const fieldOptions = useMemo(() => getAllFields(DataStore.instance.queryItems()), []);
    const EditorComponent = VIEW_EDITORS[vi.viewType];
    
    const correctedViewConfig = useMemo(() => {
        if (vi.viewConfig && typeof (vi.viewConfig as any).categories === 'object') return vi.viewConfig;
        if (vi.viewConfig && (vi.viewConfig as any).viewConfig) return (vi.viewConfig as any).viewConfig;
        return vi.viewConfig || {};
    }, [vi.viewConfig]);

    const handleUpdate = (updates: Partial<ViewInstance>) => {
        AppStore.instance.updateViewInstance(vi.id, updates);
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
                    <EditorComponent value={correctedViewConfig} onChange={(patch: any) => handleUpdate({ viewConfig: { ...correctedViewConfig, ...patch } })} fieldOptions={fieldOptions} />
                </Box>
            )}
        </Stack>
    );
}

export function ViewInstanceSettings({ app }: { app: App }) {
    const viewInstances = useStore(state => state.settings.viewInstances);
    const allGroups = useStore(state => state.settings.groups);
    const viewGroups = useMemo(() => allGroups.filter(g => g.type === 'viewInstance'), [allGroups]);

    const itemsAsTreeItems: TreeItem[] = useMemo(() => viewInstances.map(vi => ({
        ...vi,
        name: vi.title, 
        isGroup: false,
    })), [viewInstances]);

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

    const handleMoveItem = (item: TreeItem, direction: 'up' | 'down') => {
        if (!item.isGroup) {
            AppStore.instance.moveViewInstance(item.id, direction);
        }
    };

	// [核心修改] 允许复制分组
    const handleDuplicateItem = (item: TreeItem) => {
        if (item.isGroup) {
            AppStore.instance.duplicateGroup(item.id);
        } else {
            AppStore.instance.duplicateViewInstance(item.id);
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
                onMoveItem={handleMoveItem}
                onDuplicateItem={handleDuplicateItem}
            />
        </Box>
    );
}