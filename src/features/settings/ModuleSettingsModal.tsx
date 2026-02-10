// src/features/dashboard/ui/ModuleSettingsModal.tsx
/** @jsxImportSource preact */
/**
 * 【S5 术语统一】
 * - 所有 View 写操作统一通过 useCases.layout.*
 * - 禁止直接 import viewInstance.usecase
 */

import { useMemo } from 'preact/hooks';
import { FormControlLabel, Checkbox, Button } from '@mui/material';
import { VIEW_OPTIONS, ViewName, getAllFields } from '@core/public';
import type { ViewInstance } from '@core/public';
import { VIEW_EDITORS } from '@features/settings/registry';
import { useSelector, makeSelectViewInstanceById, useDataStore, useUseCases } from '@/app/public';
import { SimpleSelect } from '@shared/public';
import { RuleBuilder } from '@features/settings/RuleBuilder';
import { Modal } from '@shared/public';
import { FloatingPanel } from '@/app/public';
import { closeFloatingWidget, openFloatingWidget } from '@/app/public';

import { FormField } from '@shared/public';
import { FieldManager } from '@shared/public';
import { useSaveHandler } from '@shared/public';



// [S5 术语统一] 视图设置编辑器组件 - 通过 useCases.layout 调用
function ViewInstanceEditor({ vi }: { vi: ViewInstance }) {
    // 从 Context 获取 DataStore
    const dataStore = useDataStore();
    // S5: 通过 useUseCases 获取 useCases.layout
    const useCases = useUseCases();
    
    // 从store中获取最新的viewInstance状态
    const currentVi = useSelector(makeSelectViewInstanceById(vi.id)) || vi;
    const fieldOptions = useMemo(() => getAllFields(dataStore?.queryItems() || []), [dataStore]);
    const EditorComponent = VIEW_EDITORS[currentVi.viewType];

    const correctedViewConfig = useMemo(() => {
        if (currentVi.viewConfig && typeof (currentVi.viewConfig as any).categories === 'object') return currentVi.viewConfig;
        if (currentVi.viewConfig && (currentVi.viewConfig as any).viewConfig) return (currentVi.viewConfig as any).viewConfig;
        return currentVi.viewConfig || {};
    }, [currentVi.viewConfig]);

    // 迁移: 通过 useCases.viewInstance.updateView 更新
    const handleUpdate = (updates: Partial<ViewInstance>) => {
        useCases.viewInstance.updateView(currentVi.id, updates);
    };

    // 准备选项数据
    const viewTypeOptions = useMemo(() => 
        VIEW_OPTIONS.map(v => ({ value: v, label: v.replace('View', '') })), 
        []
    );

    // 字段更新处理 - 显示字段
    const handleFieldsChange = (fields: string[]) => {
        handleUpdate({ fields });
    };

    // 字段更新处理 - 分组字段（多字段层级分组）
    const handleGroupFieldsChange = (groupFields: string[]) => {
        handleUpdate({ groupFields });
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
                                    onChange={e => handleUpdate({ collapsed: (e.target as HTMLInputElement).checked })} 
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

                <FormField
                    label="分组字段"
                    help="选择用于分组的字段，顺序即为多级分组层级（A→B→C）"
                >
                    <FieldManager
                        fields={currentVi.groupFields || []}
                        availableFields={fieldOptions}
                        onFieldsChange={handleGroupFieldsChange}
                        placeholder="+ 选择分组字段..."
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
                        dataStore={dataStore}
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
                        dataStore={dataStore}
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
                        dataStore={dataStore}
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
}

// [P1 迁移] 移除 appStore 和 dataStore props，内部获取
export function ModuleSettingsModal({ isOpen, onClose, module }: Props) {
    // 从store中获取最新的模块状态
    const currentModule = useSelector(makeSelectViewInstanceById(module.id)) || module;

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
            <ViewInstanceEditor vi={currentModule} />
        </Modal>
    );
}

/**
 * 浮窗版本（非 Modal Overlay）
 *
 * 说明：
 * - 之前 openModuleSettingsWidget 把 <Modal/> 塞进 <FloatingPanel/>，
 *   overlay 会吞掉鼠标事件，导致“悬浮窗不能拖动”。
 * - 这里改为：FloatingPanel 负责窗口能力（拖动/点击外部关闭/zIndex），
 *   该组件只负责渲染设置表单与底部按钮。
 */
function ModuleSettingsPanel({ module, onClose }: { module: ViewInstance; onClose: () => void }) {
    const currentModule = useSelector(makeSelectViewInstanceById(module.id)) || module;

    const handleSave = useSaveHandler(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        onClose();
    }, {
        successMessage: `已保存视图 "${module.title}" 的设置`,
        errorMessage: '保存设置失败'
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '75vh' }}>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                <ViewInstanceEditor vi={currentModule} />
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                    paddingTop: 12,
                    marginTop: 12,
                    borderTop: '1px solid var(--background-modifier-border)',
                }}
            >
                <Button onClick={handleSave} variant="contained">保存设置</Button>
                <Button onClick={onClose} variant="outlined">关闭</Button>
            </div>
        </div>
    );
}

/**
 * 在浮窗 widget 中打开模块设置（供外部调用，自动负责卸载）
 */
export function openModuleSettingsWidget(module: ViewInstance) {
    const widgetId = `module-settings-${module.id}`;

    return openFloatingWidget(widgetId, () => (
        <FloatingPanel
            id={widgetId}
            title={`视图设置: ${module.title}`}
            defaultPosition={{ x: window.innerWidth / 2 - 340, y: window.innerHeight / 2 - 260 }}
            minWidth={520}
            maxWidth="90vw"
            maxHeight="85vh"
            onClose={() => closeFloatingWidget(widgetId)}
        >
            <ModuleSettingsPanel module={module} onClose={() => closeFloatingWidget(widgetId)} />
        </FloatingPanel>
    ));
}

