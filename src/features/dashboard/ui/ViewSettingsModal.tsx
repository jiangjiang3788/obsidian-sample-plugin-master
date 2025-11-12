// src/features/dashboard/ui/ViewSettingsModal.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useEffect, useMemo } from 'preact/hooks';
import { Button, FormControlLabel, Checkbox, TextField } from '@mui/material';
import { VIEW_OPTIONS, ViewName, getAllFields } from '@core/types/domain/schema';
import type { ViewInstance } from '@core/types/domain/schema';
import { VIEW_EDITORS } from '@features/settings/ui/components/view-editors/registry';
import { dataStore } from '@core/stores/storeRegistry';
import { useStore, AppStore } from '@core/stores/AppStore';
import { SimpleSelect } from '@/ui/composites/SimpleSelect';
import { Notice } from 'obsidian';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    module: ViewInstance;
    appStore: AppStore;
}

export function ViewSettingsModal({ isOpen, onClose, module, appStore }: Props) {
    const [localModule, setLocalModule] = useState<ViewInstance>({ ...module });
    const dataSources = useStore(state => state.settings.dataSources);
    const fieldOptions = useMemo(() => getAllFields(dataStore?.queryItems() || []), []);

    // 每次打开模态框时重置本地状态
    useEffect(() => {
        if (isOpen) {
            setLocalModule({ ...module });
        }
    }, [isOpen, module]);

    const EditorComponent = VIEW_EDITORS[localModule.viewType];

    const correctedViewConfig = useMemo(() => {
        if (localModule.viewConfig && typeof (localModule.viewConfig as any).categories === 'object') return localModule.viewConfig;
        if (localModule.viewConfig && (localModule.viewConfig as any).viewConfig) return (localModule.viewConfig as any).viewConfig;
        return localModule.viewConfig || {};
    }, [localModule.viewConfig]);

    const handleUpdate = (updates: Partial<ViewInstance>) => {
        setLocalModule(prev => ({ ...prev, ...updates }));
    };

    const handleSave = () => {
        // 更新视图实例
        appStore.updateViewInstance(localModule.id, localModule);
        new Notice(`已保存模块 "${localModule.title}" 的设置`);
        onClose();
    };

    const addField = (field: string) => {
        if (field && !localModule.fields?.includes(field)) {
            handleUpdate({ fields: [...(localModule.fields || []), field] });
        }
    };

    const removeField = (field: string) => {
        handleUpdate({ fields: localModule.fields?.filter(f => f !== field) });
    };

    const viewTypeOptions = VIEW_OPTIONS.map(v => ({ value: v, label: v.replace('View', '') }));
    const dataSourceOptions = dataSources.map(ds => ({ value: ds.id, label: ds.name }));
    const availableFieldOptions = fieldOptions.filter(f => !localModule.fields?.includes(f)).map(f => ({ value: f, label: f }));

    const groupFieldOptions = useMemo(() => [
        { value: '', label: '-- 不分组 --' },
        ...fieldOptions.map(f => ({ value: f, label: f }))
    ], [fieldOptions]);

    if (!isOpen) return null;

    return (
        <div class="think-modal" style={{ width: '800px', maxWidth: '90vw' }}>
            <h3>模块设置: {localModule.title}</h3>
            
            <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '1rem 0' }}>
                {/* 基础配置 */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <label style={{ width: '80px', fontWeight: 'bold' }}>视图类型:</label>
                        <SimpleSelect 
                            value={localModule.viewType} 
                            options={viewTypeOptions} 
                            onChange={val => handleUpdate({ viewType: val as ViewName })} 
                            sx={{ flex: 1, minWidth: '150px' }}
                        />
                        <FormControlLabel 
                            control={
                                <Checkbox 
                                    size="small" 
                                    checked={!!localModule.collapsed} 
                                    onChange={e => handleUpdate({ collapsed: e.target.checked })} 
                                />
                            } 
                            label="默认折叠" 
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <label style={{ width: '80px', fontWeight: 'bold' }}>数据源:</label>
                        <SimpleSelect 
                            value={localModule.dataSourceId} 
                            options={dataSourceOptions} 
                            onChange={val => handleUpdate({ dataSourceId: val })} 
                            placeholder="-- 选择数据源 --"
                            sx={{ flex: 1 }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                        <label style={{ width: '80px', fontWeight: 'bold', paddingTop: '8px' }}>显示字段:</label>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                {(localModule.fields || []).map(field => (
                                    <span 
                                        key={field} 
                                        style={{ 
                                            background: 'var(--background-modifier-border)', 
                                            padding: '4px 8px', 
                                            borderRadius: '4px', 
                                            cursor: 'pointer',
                                            fontSize: '0.9rem'
                                        }}
                                        onClick={() => removeField(field)}
                                        title={`点击移除字段: ${field}`}
                                    >
                                        {field} ✕
                                    </span>
                                ))}
                            </div>
                            <SimpleSelect 
                                value="" 
                                options={availableFieldOptions} 
                                placeholder="+ 添加字段..." 
                                onChange={val => addField(val)} 
                                sx={{ minWidth: '150px' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <label style={{ width: '80px', fontWeight: 'bold' }}>分组字段:</label>
                        <SimpleSelect 
                            value={localModule.group || ''} 
                            options={groupFieldOptions} 
                            onChange={val => handleUpdate({ group: val || undefined })} 
                            sx={{ flex: 1 }}
                        />
                    </div>
                </div>

                {/* 专属配置 */}
                {EditorComponent && (
                    <div style={{ borderTop: '1px solid var(--background-modifier-border)', paddingTop: '1rem' }}>
                        <h4 style={{ marginBottom: '1rem' }}>{localModule.viewType.replace('View', '')} 专属配置</h4>
                        <EditorComponent 
                            module={localModule} 
                            value={correctedViewConfig} 
                            onChange={(patch: any) => handleUpdate({ viewConfig: { ...correctedViewConfig, ...patch } })} 
                            fieldOptions={fieldOptions} 
                        />
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1.5rem' }}>
                <Button onClick={handleSave} variant="contained">保存设置</Button>
                <Button onClick={onClose}>取消</Button>
            </div>
        </div>
    );
}
