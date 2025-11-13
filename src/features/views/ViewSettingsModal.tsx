// src/features/dashboard/ui/ViewSettingsModal.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo } from 'preact/hooks';
import { FormControlLabel, Checkbox } from '@mui/material';
import { VIEW_OPTIONS, ViewName, getAllFields } from '@core/types/domain/schema';
import type { ViewInstance } from '@core/types/domain/schema';
import { VIEW_EDITORS } from '@features/settings/ui/components/view-editors/registry';
import { dataStore } from '@core/stores/storeRegistry';
import { useStore, AppStore } from '@core/stores/AppStore';
import { SimpleSelect } from '@shared/ui/composites/SimpleSelect';
import { Modal } from '@shared/ui/primitives/Modal';
import { FormField, FieldManager, useFormState, useSaveHandler } from '@shared/index';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    module: ViewInstance;
    appStore: AppStore;
}

export function ViewSettingsModal({ isOpen, onClose, module, appStore }: Props) {
    // 使用 viewInstances 而不是 dataSources，这是 ThinkSettings 中确实存在的属性
    const settings = useStore(state => state.settings);
    const fieldOptions = useMemo(() => getAllFields(dataStore?.queryItems() || []), []);
    
    // 使用通用表单状态管理
    const formState = useFormState<ViewInstance>(module);
    const { state: localModule, updateField, reset } = formState;

    // 每次打开模态框时重置状态
    useEffect(() => {
        if (isOpen) {
            reset(module);
        }
    }, [isOpen, module, reset]);

    const EditorComponent = VIEW_EDITORS[localModule.viewType];

    const correctedViewConfig = useMemo(() => {
        if (localModule.viewConfig && typeof (localModule.viewConfig as any).categories === 'object') return localModule.viewConfig;
        if (localModule.viewConfig && (localModule.viewConfig as any).viewConfig) return (localModule.viewConfig as any).viewConfig;
        return localModule.viewConfig || {};
    }, [localModule.viewConfig]);

    // 准备选项数据
    const viewTypeOptions = useMemo(() => 
        VIEW_OPTIONS.map(v => ({ value: v, label: v.replace('View', '') })), 
        []
    );
    
    // 修复类型错误：为 ds 参数添加类型
    const dataSourceOptions = useMemo(() => {
        // 从 viewInstances 或其他地方获取数据源选项，这里先提供一个空数组作为备用
        const dataSources: Array<{id: string, name: string}> = [];
        return dataSources.map((ds: {id: string, name: string}) => ({ value: ds.id, label: ds.name }));
    }, []);

    const groupFieldOptions = useMemo(() => [
        { value: '', label: '-- 不分组 --' },
        ...fieldOptions.map(f => ({ value: f, label: f }))
    ], [fieldOptions]);

    // 统一的保存处理
    const handleSave = useSaveHandler(async () => {
        appStore.updateViewInstance(localModule.id, localModule);
        onClose();
    }, {
        successMessage: `已保存模块 "${localModule.title}" 的设置`,
        errorMessage: '保存设置失败'
    });

    // 字段更新处理
    const handleFieldsChange = (fields: string[]) => {
        updateField('fields', fields);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`模块设置: ${localModule.title}`}
            onSave={handleSave}
            saveButtonText="保存设置"
            size="large"
        >
            {/* 基础配置 */}
            <div style={{ marginBottom: '1.5rem' }}>
                <FormField label="视图类型">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <SimpleSelect 
                            value={localModule.viewType} 
                            options={viewTypeOptions} 
                            onChange={val => updateField('viewType', val as ViewName)} 
                            sx={{ flex: 1, minWidth: '150px' }}
                        />
                        <FormControlLabel 
                            control={
                                <Checkbox 
                                    size="small" 
                                    checked={!!localModule.collapsed} 
                                    onChange={e => updateField('collapsed', e.target.checked)} 
                                />
                            } 
                            label="默认折叠" 
                        />
                    </div>
                </FormField>

                <FormField label="数据源">
                    <SimpleSelect 
                        value={localModule.dataSourceId || ''} 
                        options={dataSourceOptions} 
                        onChange={val => updateField('dataSourceId', val)} 
                        placeholder="-- 选择数据源 --"
                        sx={{ width: '100%' }}
                    />
                </FormField>

                <FormField 
                    label="显示字段" 
                    help="选择要在视图中显示的字段"
                >
                    <FieldManager 
                        fields={localModule.fields || []}
                        availableFields={fieldOptions}
                        onFieldsChange={handleFieldsChange}
                        placeholder="+ 添加字段..."
                    />
                </FormField>

                <FormField label="分组字段">
                    <SimpleSelect 
                        value={localModule.group || ''} 
                        options={groupFieldOptions} 
                        onChange={val => updateField('group', val || undefined)} 
                        sx={{ width: '100%' }}
                    />
                </FormField>
            </div>

            {/* 专属配置 */}
            {EditorComponent && (
                <div style={{ 
                    borderTop: '1px solid var(--background-modifier-border)', 
                    paddingTop: '1.5rem',
                    marginTop: '1.5rem'
                }}>
                    <h4 style={{ 
                        marginBottom: '1rem', 
                        color: 'var(--text-muted)',
                        fontSize: '1rem'
                    }}>
                        {localModule.viewType.replace('View', '')} 专属配置
                    </h4>
                    <EditorComponent 
                        module={localModule} 
                        value={correctedViewConfig} 
                        onChange={(patch: any) => updateField('viewConfig', { ...correctedViewConfig, ...patch })} 
                        fieldOptions={fieldOptions} 
                    />
                </div>
            )}
        </Modal>
    );
}
