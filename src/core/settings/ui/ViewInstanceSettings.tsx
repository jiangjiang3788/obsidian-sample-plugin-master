// src/core/settings/ui/ViewInstanceSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { 
    Accordion, AccordionSummary, AccordionDetails, Box, Stack, Typography, 
    IconButton, TextField, FormControlLabel, Checkbox, 
    Tooltip, Chip
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { usePersistentState } from '@shared/hooks/usePersistentState';
import { LOCAL_STORAGE_KEYS, DEFAULT_NAMES } from '@core/domain/constants';
import { VIEW_OPTIONS, ViewName, getAllFields, Period } from '@core/domain/schema';
import type { ViewInstance } from '@core/domain/schema';
import { VIEW_EDITORS } from '@features/dashboard/settings/ModuleEditors/registry';
import { DataStore } from '@core/services/dataStore';
import { useMemo, useState, useEffect } from 'preact/hooks';
// --- 新增：导入我们自己的组件 ---
import { SimpleSelect } from '@shared/ui/SimpleSelect';


const LABEL_WIDTH = '80px';

function ViewInstanceEditor({ vi }: { vi: ViewInstance }) {
    const dataSources = useStore(state => state.settings.dataSources);
    const fieldOptions = useMemo(() => getAllFields(DataStore.instance.queryItems()), []);
    const EditorComponent = VIEW_EDITORS[vi.viewType];
    const dateConfig = vi.dateConfig || { mode: 'inherit_from_layout' };
    const [title, setTitle] = useState(vi.title);

    useEffect(() => {
        setTitle(vi.title);
    }, [vi]);

    const correctedViewConfig = useMemo(() => {
        // ... (این تابع بدون تغییر باقی می ماند)
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
    
    // ... ( سایر توابع handle بدون تغییر باقی می مانند)
    const addField = (field: string) => {
        if (field && !vi.fields?.includes(field)) {
            handleUpdate({ fields: [...(vi.fields || []), field] });
        }
    };

    const removeField = (field: string) => {
        handleUpdate({ fields: vi.fields?.filter(f => f !== field) });
    };

    // --- 为新的SimpleSelect准备options数据 ---
    const viewTypeOptions = VIEW_OPTIONS.map(v => ({ value: v, label: v.replace('View', '') }));
    const dataSourceOptions = dataSources.map(ds => ({ value: ds.id, label: ds.name }));
    const dateModeOptions = [
        { value: 'inherit_from_layout', label: '继承布局' },
        { value: 'fixed_period', label: '固定周期' }
    ];
    const periodOptions = ['年', '季', '月', '周', '天'].map(p => ({ value: p, label: p }));
    const availableFieldOptions = fieldOptions.filter(f => !vi.fields?.includes(f)).map(f => ({ value: f, label: f }));
    const groupFieldOptions = fieldOptions.map(f => ({ value: f, label: f }));


    return (
        <Stack spacing={2} sx={{ p: '8px 16px' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>视图标题</Typography>
                <TextField
                    variant="outlined" size="small"
                    value={title}
                    onChange={e => setTitle((e.target as HTMLInputElement).value)}
                    onBlur={handleTitleBlur}
                    sx={{ maxWidth: '400px', flexGrow: 1 }}
                />
                <FormControlLabel
                    control={<Checkbox size="small" checked={!!vi.collapsed} onChange={e => handleUpdate({ collapsed: e.target.checked })} />}
                    label={<Typography noWrap>默认折叠</Typography>}
                />
            </Stack>

            <Stack direction="row" alignItems="center" spacing={2}>
                 <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>基础配置</Typography>
                 {/* --- 重构：使用 SimpleSelect --- */}
                <SimpleSelect
                    value={vi.viewType}
                    options={viewTypeOptions}
                    onChange={val => handleUpdate({ viewType: val as ViewName })}
                    sx={{ minWidth: 150, flexGrow: 1 }}
                />
                <SimpleSelect
                    value={vi.dataSourceId}
                    options={dataSourceOptions}
                    placeholder="-- 选择数据源 --"
                    onChange={val => handleUpdate({ dataSourceId: val })}
                    sx={{ minWidth: 150, flexGrow: 1 }}
                />
            </Stack>
            
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>日期处理</Typography>
                <SimpleSelect
                    value={dateConfig.mode}
                    options={dateModeOptions}
                    onChange={val => handleUpdate({ dateConfig: { ...dateConfig, mode: val as any } })}
                    sx={{ minWidth: 150, flexGrow: 1 }}
                />
                {dateConfig.mode === 'fixed_period' && (
                    <SimpleSelect
                        value={dateConfig.period || '月'}
                        options={periodOptions}
                        onChange={val => handleUpdate({ dateConfig: { ...dateConfig, period: val as Period } })}
                        sx={{ minWidth: 150, flexGrow: 1 }}
                    />
                )}
            </Stack>

            <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap alignItems="center">
                <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>显示字段</Typography>
                {(vi.fields || []).map(field => (
                    <Tooltip key={field} title={`点击移除字段: ${field}`}>
                        <Chip label={field} onClick={() => removeField(field)} size="small" />
                    </Tooltip>
                ))}
                {/* --- 重构：使用 SimpleSelect 添加字段 --- */}
                <SimpleSelect
                    value="" // 值总是为空，因为它是一个操作按钮
                    options={availableFieldOptions}
                    placeholder="+ 添加字段..."
                    onChange={val => addField(val)} // 选择后立即添加
                    sx={{ minWidth: 150 }}
                />
            </Stack>

            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>分组字段</Typography>
                <SimpleSelect
                    fullWidth
                    value={vi.group || ''}
                    options={groupFieldOptions}
                    placeholder="-- 不分组 --"
                    onChange={val => handleUpdate({ group: val || undefined })}
                />
            </Stack>

            {EditorComponent && (
                <Box pt={1} mt={1} sx={{borderTop: '1px solid rgba(0,0,0,0.08)'}}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, mt: 1 }}>{vi.viewType.replace('View','')} 专属配置</Typography>
                    <EditorComponent
                        value={correctedViewConfig}
                        onChange={(patch: any) => handleUpdate({ viewConfig: { ...correctedViewConfig, ...patch } })}
                        fieldOptions={fieldOptions}
                    />
                </Box>
            )}
        </Stack>
    );
}

// ... (ViewInstanceSettings 的 JSX 代码与之前相同)
export function ViewInstanceSettings() {
    const viewInstances = useStore(state => state.settings.viewInstances);
    const [openId, setOpenId] = usePersistentState<string | null>(LOCAL_STORAGE_KEYS.SETTINGS_VIEW_OPEN, null);

    const handleAdd = () => {
        AppStore.instance.addViewInstance(DEFAULT_NAMES.NEW_VIEW).then(() => {
            const latestVi = AppStore.instance.getSettings().viewInstances.at(-1);
            if (latestVi) setOpenId(latestVi.id);
        });
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`确认删除视图 "${name}" 吗？\n布局中对该视图的引用将被移除。`)) {
            AppStore.instance.deleteViewInstance(id);
        }
    };

    const handleDuplicate = (id: string) => {
        AppStore.instance.duplicateViewInstance(id);
    };

    const handleMove = (id: string, direction: 'up' | 'down') => {
        AppStore.instance.moveViewInstance(id, direction);
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
            <Stack spacing={1}>
                {viewInstances.map((vi, index) => (
                    <Accordion
                        key={vi.id}
                        expanded={openId === vi.id}
                        onChange={() => setOpenId(openId === vi.id ? null : vi.id)}
                        disableGutters
                        elevation={1}
                        sx={{ '&:before': { display: 'none' } }}
                    >
                        <AccordionSummary
                            sx={{
                                minHeight: 48,
                                '& .MuiAccordionSummary-content': { my: '12px', alignItems: 'center', justifyContent: 'space-between' },
                                cursor: 'pointer',
                            }}
                        >
                            <Typography fontWeight={500}>{vi.title}</Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <Tooltip title="上移">
                                    <span>
                                        <IconButton size="small" sx={{ fontSize: '1.2em' }} disabled={index === 0} onClick={e => { e.stopPropagation(); handleMove(vi.id, 'up'); }}>
                                            ▲
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="下移">
                                    <span>
                                        <IconButton size="small" sx={{ fontSize: '1.2em' }} disabled={index === viewInstances.length - 1} onClick={e => { e.stopPropagation(); handleMove(vi.id, 'down'); }}>
                                            ▼
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="复制此视图">
                                    <IconButton size="small" onClick={e => { e.stopPropagation(); handleDuplicate(vi.id); }}>
                                        <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="删除此视图">
                                    <IconButton
                                        size="small"
                                        onClick={e => { e.stopPropagation(); handleDelete(vi.id, vi.title); }}
                                        sx={{ color: 'text.secondary', opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}
                                    >
                                        <DeleteForeverOutlinedIcon />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ bgcolor: 'action.hover', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                            <ViewInstanceEditor vi={vi} />
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Stack>
        </Box>
    );
}