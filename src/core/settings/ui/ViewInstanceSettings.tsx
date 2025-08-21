// src/core/settings/ui/ViewInstanceSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { Box, Stack, Typography, IconButton, TextField, FormControlLabel, Checkbox, Tooltip, Chip } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { usePersistentState } from '@shared/hooks/usePersistentState';
import { LOCAL_STORAGE_KEYS, DEFAULT_NAMES } from '@core/domain/constants';
import { VIEW_OPTIONS, ViewName, getAllFields } from '@core/domain/schema';
import type { ViewInstance } from '@core/domain/schema';
import { VIEW_EDITORS } from '@features/dashboard/settings/ModuleEditors/registry';
import { DataStore } from '@core/services/dataStore';
import { useMemo, useState, useEffect } from 'preact/hooks';
import { SimpleSelect } from '@shared/ui/SimpleSelect';
import { EditableAccordionList } from './components/EditableAccordionList'; // [新增] 导入新组件

// [保留] ViewInstanceEditor 自身逻辑不变
const LABEL_WIDTH = '80px';

function ViewInstanceEditor({ vi }: { vi: ViewInstance }) {
    const dataSources = useStore(state => state.settings.dataSources);
    const fieldOptions = useMemo(() => getAllFields(DataStore.instance.queryItems()), []);
    const EditorComponent = VIEW_EDITORS[vi.viewType];
    const [title, setTitle] = useState(vi.title);

    useEffect(() => {
        setTitle(vi.title);
    }, [vi]);

    const correctedViewConfig = useMemo(() => {
        if (vi.viewConfig && typeof (vi.viewConfig as any).categories === 'object') return vi.viewConfig;
        if (vi.viewConfig && (vi.viewConfig as any).viewConfig) return (vi.viewConfig as any).viewConfig;
        return vi.viewConfig || {};
    }, [vi.viewConfig]);

    const handleUpdate = (updates: Partial<ViewInstance>) => {
        AppStore.instance.updateViewInstance(vi.id, updates);
    };

    const handleTitleBlur = () => {
        if (title !== vi.title) {
            handleUpdate({ title: title });
        }
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
    const groupFieldOptions = fieldOptions.map(f => ({ value: f, label: f }));

    return (
        <Stack spacing={2} sx={{ p: '8px 16px' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>视图标题</Typography>
                <TextField variant="outlined" size="small" value={title} onChange={e => setTitle((e.target as HTMLInputElement).value)} onBlur={handleTitleBlur} sx={{ maxWidth: '400px', flexGrow: 1 }} />
                <FormControlLabel control={<Checkbox size="small" checked={!!vi.collapsed} onChange={e => handleUpdate({ collapsed: e.target.checked })} />} label={<Typography noWrap>默认折叠</Typography>} />
            </Stack>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>基础配置</Typography>
                <SimpleSelect value={vi.viewType} options={viewTypeOptions} onChange={val => handleUpdate({ viewType: val as ViewName })} sx={{ minWidth: 150, flexGrow: 1 }} />
                <SimpleSelect value={vi.dataSourceId} options={dataSourceOptions} placeholder="-- 选择数据源 --" onChange={val => handleUpdate({ dataSourceId: val })} sx={{ minWidth: 150, flexGrow: 1 }} />
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
                <SimpleSelect fullWidth value={vi.group || ''} options={groupFieldOptions} placeholder="-- 不分组 --" onChange={val => handleUpdate({ group: val || undefined })} />
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

// [修改] 主组件重构
export function ViewInstanceSettings() {
    const viewInstances = useStore(state => state.settings.viewInstances);
    const [openId, setOpenId] = usePersistentState<string | null>(LOCAL_STORAGE_KEYS.SETTINGS_VIEW_OPEN, null);

    const handleAdd = () => {
        AppStore.instance.addViewInstance(DEFAULT_NAMES.NEW_VIEW).then(() => {
            const latestVi = AppStore.instance.getSettings().viewInstances.at(-1);
            if (latestVi) setOpenId(latestVi.id);
        });
    };

    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Typography variant="h6">管理视图</Typography>
                <Tooltip title="新增视图">
                    <IconButton onClick={handleAdd} color="success">
                        <AddCircleOutlineIcon />
                    </IconButton>
                </Tooltip>
            </Stack>
            
            {/* [核心修改] 使用新组件 */}
            <EditableAccordionList
                items={viewInstances}
                getItemTitle={(vi) => vi.title}
                renderItem={(vi) => <ViewInstanceEditor vi={vi} />}
                openId={openId}
                setOpenId={setOpenId}
                onDeleteItem={(id) => AppStore.instance.deleteViewInstance(id)}
                onMoveItem={(id, direction) => AppStore.instance.moveViewInstance(id, direction)}
                onDuplicateItem={(id) => AppStore.instance.duplicateViewInstance(id)}
                deleteConfirmationText={(name) => `确认删除视图 "${name}" 吗？\n布局中对该视图的引用将被移除。`}
            />
        </Box>
    );
}