// src/features/dashboard/ui/ModuleSettingsModal.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { Button, FormControlLabel, Checkbox } from '@mui/material';
import { VIEW_OPTIONS, ViewName, getAllFields } from '@core/domain/schema';
import type { ViewInstance, DataSource } from '@core/domain/schema';
import { VIEW_EDITORS } from '@features/settings/ui/components/view-editors/registry';
import { dataStore } from '@state/storeRegistry';
import { useStore, AppStore } from '@state/AppStore';
import { SimpleSelect } from '@shared/ui/SimpleSelect';
import { RuleBuilder } from '@features/settings/ui/components/RuleBuilder';
import { Notice } from 'obsidian';

// 视图设置编辑器组件
function ViewInstanceEditor({ vi, appStore }: { vi: ViewInstance, appStore: AppStore }) {
    const dataSources = useStore(state => state.settings.dataSources);
    const fieldOptions = useMemo(() => getAllFields(dataStore?.queryItems() || []), []);
    const EditorComponent = VIEW_EDITORS[vi.viewType];

    const correctedViewConfig = useMemo(() => {
        if (vi.viewConfig && typeof (vi.viewConfig as any).categories === 'object') return vi.viewConfig;
        if (vi.viewConfig && (vi.viewConfig as any).viewConfig) return (vi.viewConfig as any).viewConfig;
        return vi.viewConfig || {};
    }, [vi.viewConfig]);

    const handleUpdate = (updates: Partial<ViewInstance>) => {
        appStore.updateViewInstance(vi.id, updates);
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
        <div style={{ marginBottom: '2rem' }}>
            {/* 基础配置 */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <label style={{ width: '80px', fontWeight: 'bold' }}>视图类型:</label>
                    <SimpleSelect 
                        value={vi.viewType} 
                        options={viewTypeOptions} 
                        onChange={val => handleUpdate({ viewType: val as ViewName })} 
                        sx={{ flex: 1, minWidth: '150px' }}
                    />
                    <FormControlLabel 
                        control={
                            <Checkbox 
                                size="small" 
                                checked={!!vi.collapsed} 
                                onChange={e => handleUpdate({ collapsed: e.target.checked })} 
                            />
                        } 
                        label="默认折叠" 
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <label style={{ width: '80px', fontWeight: 'bold' }}>数据源:</label>
                    <SimpleSelect 
                        value={vi.dataSourceId} 
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
                            {(vi.fields || []).map(field => (
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
                        value={vi.group || ''} 
                        options={groupFieldOptions} 
                        onChange={val => handleUpdate({ group: val || undefined })} 
                        sx={{ flex: 1 }}
                    />
                </div>
            </div>

            {/* 专属配置 */}
            {EditorComponent && (
                <div style={{ borderTop: '1px solid var(--background-modifier-border)', paddingTop: '1rem' }}>
                    <h4 style={{ marginBottom: '1rem' }}>{vi.viewType.replace('View', '')} 专属配置</h4>
                    <EditorComponent 
                        module={vi} 
                        value={correctedViewConfig} 
                        onChange={(patch: any) => handleUpdate({ viewConfig: { ...correctedViewConfig, ...patch } })} 
                        fieldOptions={fieldOptions} 
                    />
                </div>
            )}
        </div>
    );
}

// 数据源设置编辑器组件
function DataSourceEditor({ ds, appStore }: { ds: DataSource, appStore: AppStore }) {
    const fieldOptions = useMemo(() => {
        const currentDataStore = dataStore;
        if (!currentDataStore) return [];
        const allItems = currentDataStore.queryItems();
        return getAllFields(allItems);
    }, []);

    const handleUpdate = (updates: Partial<DataSource>) => {
        appStore.updateDataSource(ds.id, updates);
    };

    return (
        <div>
            <div style={{ marginBottom: '1.5rem' }}>
                <RuleBuilder 
                    title="过滤规则" 
                    mode="filter" 
                    rows={ds.filters} 
                    fieldOptions={fieldOptions} 
                    onChange={(rows: any) => handleUpdate({ filters: rows })} 
                />
            </div>
            <div>
                <RuleBuilder 
                    title="排序规则" 
                    mode="sort" 
                    rows={ds.sort} 
                    fieldOptions={fieldOptions} 
                    onChange={(rows: any) => handleUpdate({ sort: rows })} 
                />
            </div>
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
    const [activeTab, setActiveTab] = useState('datasource');
    const dataSources = useStore(state => state.settings.dataSources);
    
    // 找到当前模块使用的数据源
    const currentDataSource = dataSources.find(ds => ds.id === module.dataSourceId);

    const handleSave = () => {
        new Notice(`已保存模块 "${module.title}" 的设置`);
        onClose();
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
                <h3 style={{ margin: '0 0 1.5rem 0' }}>模块设置: {module.title}</h3>
                
                {/* 标签页导航 */}
                <div style={{ 
                    display: 'flex', 
                    borderBottom: '2px solid var(--background-modifier-border)', 
                    marginBottom: '1.5rem' 
                }}>
                    <button 
                        style={{
                            padding: '8px 16px',
                            border: 'none',
                            background: activeTab === 'datasource' ? 'var(--interactive-accent)' : 'transparent',
                            color: activeTab === 'datasource' ? 'var(--text-on-accent)' : 'var(--text-normal)',
                            cursor: 'pointer',
                            opacity: currentDataSource ? 1 : 0.5
                        }}
                        onClick={() => currentDataSource && setActiveTab('datasource')}
                        disabled={!currentDataSource}
                    >
                        数据源设置
                    </button>
                    <button 
                        style={{
                            padding: '8px 16px',
                            border: 'none',
                            background: activeTab === 'view' ? 'var(--interactive-accent)' : 'transparent',
                            color: activeTab === 'view' ? 'var(--text-on-accent)' : 'var(--text-normal)',
                            cursor: 'pointer'
                        }}
                        onClick={() => setActiveTab('view')}
                    >
                        视图设置
                    </button>
                </div>
                
                <div style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: '0 0.5rem',
                    minHeight: '400px',
                    maxHeight: 'calc(95vh - 200px)'
                }}>
                    {activeTab === 'view' && (
                        <ViewInstanceEditor vi={module} appStore={appStore} />
                    )}
                    
                    {activeTab === 'datasource' && (
                        currentDataSource ? (
                            <DataSourceEditor ds={currentDataSource} appStore={appStore} />
                        ) : (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                                请先为此视图选择一个数据源
                            </div>
                        )
                    )}
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
