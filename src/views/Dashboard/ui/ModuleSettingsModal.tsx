// src/features/dashboard/ui/ModuleSettingsModal.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { Button, FormControlLabel, Checkbox } from '@mui/material';
import { VIEW_OPTIONS, ViewName, getAllFields } from '@/lib/types/domain/schema';
import type { ViewInstance } from '@/lib/types/domain/schema';
import { VIEW_EDITORS } from '@views/Settings/ui/components/view-editors/registry';
import { dataStore } from '@store/storeRegistry';
import { useStore, AppStore } from '@core/stores/AppStore';
import { SimpleSelect } from '@ui/composites/SimpleSelect';
import { RuleBuilder } from '@views/Settings/ui/components/RuleBuilder';
import { Notice } from 'obsidian';

// 视图设置编辑器组件
function ViewInstanceEditor({ vi, appStore }: { vi: ViewInstance, appStore: AppStore }) {
    // 从store中获取最新的viewInstance状态，而不是使用传入的props
    const currentVi = useStore(state => state.settings.viewInstances.find(v => v.id === vi.id)) || vi;
    const fieldOptions = useMemo(() => getAllFields(dataStore?.queryItems() || []), []);
    const EditorComponent = VIEW_EDITORS[currentVi.viewType];

    const correctedViewConfig = useMemo(() => {
        if (currentVi.viewConfig && typeof (currentVi.viewConfig as any).categories === 'object') return currentVi.viewConfig;
        if (currentVi.viewConfig && (currentVi.viewConfig as any).viewConfig) return (currentVi.viewConfig as any).viewConfig;
        return currentVi.viewConfig || {};
    }, [currentVi.viewConfig]);

    const handleUpdate = (updates: Partial<ViewInstance>) => {
        appStore.updateViewInstance(currentVi.id, updates);
    };

    const addField = (field: string) => {
        if (field && !currentVi.fields?.includes(field)) {
            handleUpdate({ fields: [...(currentVi.fields || []), field] });
        }
    };

    const removeField = (field: string) => {
        handleUpdate({ fields: currentVi.fields?.filter(f => f !== field) });
    };

    const viewTypeOptions = VIEW_OPTIONS.map(v => ({ value: v, label: v.replace('View', '') }));
    const availableFieldOptions = fieldOptions.filter(f => !currentVi.fields?.includes(f)).map(f => ({ value: f, label: f }));

    const groupFieldOptions = useMemo(() => [
        { value: '', label: '-- 不分组 --' },
        ...fieldOptions.map(f => ({ value: f, label: f }))
    ], [fieldOptions]);

    return (
        <div style={{ marginBottom: '2rem' }}>
            {/* 基础配置 */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>基础设置</h4>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <label style={{ width: '80px', fontWeight: 'bold' }}>视图类型:</label>
                    <SimpleSelect 
                        value={currentVi.viewType} 
                        options={viewTypeOptions} 
                        onChange={val => handleUpdate({ viewType: val as ViewName })} 
                        sx={{ flex: 1, minWidth: '150px' }}
                    />
                    <FormControlLabel 
                        control={
                            <Checkbox 
                                size="small" 
                                checked={!!currentVi.collapsed} 
                                onChange={e => handleUpdate({ collapsed: e.target.checked })} 
                            />
                        } 
                        label="默认折叠" 
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                    <label style={{ width: '80px', fontWeight: 'bold', paddingTop: '8px' }}>显示字段:</label>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            {(currentVi.fields || []).map(field => (
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
                        value={currentVi.group || ''} 
                        options={groupFieldOptions} 
                        onChange={val => handleUpdate({ group: val || undefined })} 
                        sx={{ flex: 1 }}
                    />
                </div>
            </div>

            {/* [新增] 数据筛选和排序 */}
            <div style={{ borderTop: '1px solid var(--background-modifier-border)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>数据筛选与排序</h4>
                
                <div style={{ marginBottom: '1.5rem' }}>
                    <RuleBuilder 
                        title="筛选规则" 
                        mode="filter" 
                        rows={currentVi.filters || []} 
                        fieldOptions={fieldOptions} 
                        onChange={(rows: any) => handleUpdate({ filters: rows })} 
                    />
                </div>
                
                <div>
                    <RuleBuilder 
                        title="排序规则" 
                        mode="sort" 
                        rows={currentVi.sort || []} 
                        fieldOptions={fieldOptions} 
                        onChange={(rows: any) => handleUpdate({ sort: rows })} 
                    />
                </div>
            </div>

            {/* 专属配置 */}
            {EditorComponent && (
                <div style={{ borderTop: '1px solid var(--background-modifier-border)', paddingTop: '1.5rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>{currentVi.viewType.replace('View', '')} 专属配置</h4>
                    <EditorComponent 
                        module={currentVi} 
                        value={correctedViewConfig} 
                        onChange={(patch: any) => handleUpdate({ viewConfig: { ...correctedViewConfig, ...patch } })} 
                        fieldOptions={fieldOptions} 
                    />
                </div>
            )}
        </div>
    );
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    module: ViewInstance;
    appStore: AppStore;
}

export function ModuleSettingsModal({ isOpen, onClose, module, appStore }: Props) {
    // 从store中获取最新的模块状态
    const currentModule = useStore(state => state.settings.viewInstances.find(v => v.id === module.id)) || module;

    const handleSave = async () => {
        try {
            // 确保所有待保存的更改都已经通过 appStore 的方法处理了
            // 由于每次更改都会立即调用 updateViewInstance
            // 这里我们只需要等待一小段时间确保最后的更新完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            new Notice(`已保存视图 "${module.title}" 的设置`);
            onClose();
        } catch (error) {
            console.error('保存设置时出错:', error);
            new Notice('保存设置失败，请重试');
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            minHeight: '100vh'
        }}>
            <div style={{
                backgroundColor: 'var(--background-primary)',
                borderRadius: '8px',
                border: '1px solid var(--background-modifier-border)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                width: '900px',
                maxWidth: '95vw',
                minHeight: '600px',
                height: 'auto',
                display: 'flex',
                flexDirection: 'column',
                padding: '1.5rem',
                margin: '40px auto',
                position: 'relative'
            }}>
                <h3 style={{ margin: '0 0 1.5rem 0' }}>视图设置: {module.title}</h3>
                
                <div style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: '0 0.5rem',
                    minHeight: '400px',
                    maxHeight: 'calc(95vh - 200px)'
                }}>
                    <ViewInstanceEditor vi={currentModule} appStore={appStore} />
                </div>

                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    gap: '8px', 
                    marginTop: '1.5rem',
                    flexShrink: 0
                }}>
                    <Button onClick={handleSave} variant="contained">保存设置</Button>
                    <Button onClick={onClose}>关闭</Button>
                </div>
            </div>
        </div>
    );
}
