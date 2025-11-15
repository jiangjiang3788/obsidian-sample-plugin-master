// src/features/dashboard/ui/ModuleSettingsModal.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { FormControlLabel, Checkbox } from '@mui/material';
import { VIEW_OPTIONS, ViewName, getAllFields } from '@/core/types/schema';
import type { ViewInstance } from '@/core/types/schema';
import { VIEW_EDITORS } from '@features/settings/registry';
import { dataStore } from '@core/stores/storeRegistry';
import { useStore, AppStore } from '@core/stores/AppStore';
import { SimpleSelect } from '@shared/ui/composites/SimpleSelect';
import { RuleBuilder } from '@features/settings/RuleBuilder';
import { Modal } from '@shared/ui/primitives/Modal';
import { FormField, FieldManager, useSaveHandler } from '@shared/index';

// 重构后的视图设置编辑器组件 - 使用通用组件
function ViewInstanceEditor({ vi, appStore }: { vi: ViewInstance, appStore: AppStore }) {
    // 从store中获取最新的viewInstance状态
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

    // 准备选项数据
    const viewTypeOptions = useMemo(() => 
        VIEW_OPTIONS.map(v => ({ value: v, label: v.replace('View', '') })), 
        []
    );

    const groupFieldOptions = useMemo(() => [
        { value: '', label: '-- 不分组 --' },
        ...fieldOptions.map(f => ({ value: f, label: f }))
    ], [fieldOptions]);

    // 字段更新处理
    const handleFieldsChange = (fields: string[]) => {
        handleUpdate({ fields });
    };

    return (
        <div>
            {/* 基础设置 */}
            <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ 
                    marginBottom: '1rem', 
                    color: 'var(--text-muted)',
                    fontSize: '1rem',
                    fontWeight: '600'
                }}>
                    基础设置
                </h4>
                
                <FormField label="视图类型">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                </FormField>

                <FormField 
                    label="显示字段" 
                    help="选择要在视图中显示的字段"
                >
                    <FieldManager 
                        fields={currentVi.fields || []}
                        availableFields={fieldOptions}
                        onFieldsChange={handleFieldsChange}
                        placeholder="+ 添加字段..."
                    />
                </FormField>

                <FormField label="分组字段">
                    <SimpleSelect 
                        value={currentVi.group || ''} 
                        options={groupFieldOptions} 
                        onChange={val => handleUpdate({ group: val || undefined })} 
                        sx={{ width: '100%' }}
                    />
                </FormField>
            </div>

            {/* 数据筛选和排序 */}
            <div style={{ 
                borderTop: '1px solid var(--background-modifier-border)', 
                paddingTop: '1.5rem', 
                marginBottom: '1.5rem' 
            }}>
                <h4 style={{ 
                    marginBottom: '1rem', 
                    color: 'var(--text-muted)',
                    fontSize: '1rem',
                    fontWeight: '600'
                }}>
                    数据筛选与排序
                </h4>
                
                <FormField 
                    label="筛选规则" 
                    help="定义数据筛选条件"
                >
                    <RuleBuilder 
                        title="筛选规则" 
                        mode="filter" 
                        rows={currentVi.filters || []} 
                        fieldOptions={fieldOptions} 
                        onChange={(rows: any) => handleUpdate({ filters: rows })} 
                    />
                </FormField>
                
                <FormField 
                    label="排序规则" 
                    help="定义数据排序方式"
                >
                    <RuleBuilder 
                        title="排序规则" 
                        mode="sort" 
                        rows={currentVi.sort || []} 
                        fieldOptions={fieldOptions} 
                        onChange={(rows: any) => handleUpdate({ sort: rows })} 
                    />
                </FormField>
            </div>

            {/* 专属配置 */}
            {EditorComponent && (
                <div style={{ 
                    borderTop: '1px solid var(--background-modifier-border)', 
                    paddingTop: '1.5rem' 
                }}>
                    <h4 style={{ 
                        marginBottom: '1rem', 
                        color: 'var(--text-muted)',
                        fontSize: '1rem',
                        fontWeight: '600'
                    }}>
                        {currentVi.viewType.replace('View', '')} 专属配置
                    </h4>
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

    // 使用统一的保存处理模式
    const handleSave = useSaveHandler(async () => {
        // 由于 ViewInstanceEditor 中的每次更改都会立即调用 updateViewInstance
        // 这里我们只需要等待一小段时间确保最后的更新完成
        await new Promise(resolve => setTimeout(resolve, 100));
        onClose();
    }, {
        successMessage: `已保存视图 "${module.title}" 的设置`,
        errorMessage: '保存设置失败'
    });

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`视图设置: ${module.title}`}
            onSave={handleSave}
            saveButtonText="保存设置"
            size="large"
        >
            <ViewInstanceEditor vi={currentModule} appStore={appStore} />
        </Modal>
    );
}
