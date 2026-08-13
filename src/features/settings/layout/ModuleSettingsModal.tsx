// src/features/dashboard/ui/ModuleSettingsModal.tsx
/** @jsxImportSource preact */
/**
 * 【S5 术语统一】
 * - 所有 View 写操作统一通过 useCases.layout.*
 * - 禁止直接 import viewInstance.usecase
 */

import { useMemo } from 'preact/hooks';
import {
  ThinkButton,
  ThinkCheckbox,
  ThinkDisclosure,
} from '@shared/ui/public';
import { VIEW_OPTIONS, ViewName, getAllFields } from '@core/types/public';
import { getFieldLabel, getFieldCategoryLabel } from '@core/fields/public';
import { normalizeDisplayFields, normalizeViewFilters, normalizeViewGroupFields, normalizeViewSort } from '@core/view/public';
import type { FilterRule, ViewInstance } from '@core/types/public';
import { VIEW_EDITORS } from '@features/settings/views/editors/registry';
import { useSelector, makeSelectViewInstanceById, useDataStore, useUseCases } from '@/app/public';
import {
  FieldManager,
  FormField,
  Modal,
  SimpleSelect,
} from '@shared/ui/public';
import { useSaveHandler } from '@shared/patterns/public';
import { RuleBuilder } from '@features/settings/views/editors/RuleBuilder';
import { CommonFilterPanel } from '@features/settings/views/editors/CommonFilterPanel';
import { FloatingPanel } from '@/app/public';
import { closeFloatingWidget, openFloatingWidget } from '@/app/public';




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
    const viewTypeOptions = useMemo(() => {
        const labels: Partial<Record<ViewName, string>> = { ProgressView: '成长', EnergyView: '精力' };
        return VIEW_OPTIONS.map(v => ({ value: v, label: labels[v] || v.replace('View', '') }));
    }, []);

    const commonFilterFields = useMemo(() => ['goalPath', 'goalId', 'coreBlock', 'themePath', 'status', 'cadence', 'priority', 'period.label'], []);
    const hasAdvancedFilters = useMemo(() => (currentVi.filters || []).some((rule: any) => (
        rule.op !== 'in' || !commonFilterFields.includes(rule.field)
    )), [currentVi.filters, commonFilterFields]);

    // 字段更新处理 - 显示字段
    const handleFieldsChange = (fields: string[]) => {
        handleUpdate({ fields: normalizeDisplayFields(fields, { includeUnknown: true }) });
    };

    // 字段更新处理 - 分组字段（多字段层级分组）
    const handleGroupFieldsChange = (groupFields: string[]) => {
        handleUpdate({ groupFields: normalizeViewGroupFields(groupFields) });
    };

    return (
        <div className="think-module-settings">
            <section className="think-module-settings__section">
                <h4 className="think-module-settings__section-title">基础设置</h4>
                <div className="think-module-settings__fields">
                    <FormField label="视图类型">
                        <div className="think-module-settings__inline">
                            <SimpleSelect
                                value={currentVi.viewType}
                                options={viewTypeOptions}
                                onChange={val => handleUpdate({ viewType: val as ViewName })}
                                fullWidth
                                className="think-module-settings__view-type"
                            />
                            <ThinkCheckbox
                                checked={!!currentVi.collapsed}
                                onChange={e => handleUpdate({ collapsed: (e.currentTarget as HTMLInputElement).checked })}
                                label="默认折叠"
                                compact
                            />
                        </div>
                    </FormField>

                    <FormField label="显示字段">
                        <FieldManager
                            fields={currentVi.fields || []}
                            availableFields={fieldOptions}
                            onFieldsChange={handleFieldsChange}
                            placeholder="添加字段…"
                            getFieldLabel={getFieldLabel}
                            getFieldGroupLabel={getFieldCategoryLabel}
                        />
                    </FormField>

                    <FormField label="分组字段">
                        <FieldManager
                            fields={currentVi.groupFields || []}
                            availableFields={fieldOptions}
                            onFieldsChange={handleGroupFieldsChange}
                            placeholder="选择分组字段…"
                            getFieldLabel={getFieldLabel}
                            getFieldGroupLabel={getFieldCategoryLabel}
                        />
                    </FormField>
                </div>
            </section>

            <section className="think-module-settings__section">
                <h4 className="think-module-settings__section-title">筛选与排序</h4>
                <CommonFilterPanel
                    title="常用筛选"
                    dataStore={dataStore}
                    filters={currentVi.filters || []}
                    fieldOptions={fieldOptions}
                    onChange={(rows: FilterRule[]) => handleUpdate({ filters: normalizeViewFilters(rows) })}
                    compact
                />

                <ThinkDisclosure
                    title="高级筛选"
                    meta={`${(currentVi.filters || []).length} 条`}
                    open={hasAdvancedFilters || undefined}
                    className="think-module-settings__advanced"
                >
                    <RuleBuilder
                        title="筛选"
                        mode="filter"
                        rows={currentVi.filters || []}
                        fieldOptions={fieldOptions}
                        onChange={(rows: any) => handleUpdate({ filters: normalizeViewFilters(rows) })}
                        dataStore={dataStore}
                        variant="panel"
                        showHeader={false}
                    />
                </ThinkDisclosure>

                <RuleBuilder
                    title="排序"
                    mode="sort"
                    rows={currentVi.sort || []}
                    fieldOptions={fieldOptions}
                    onChange={(rows: any) => handleUpdate({ sort: normalizeViewSort(rows) })}
                    dataStore={dataStore}
                />
            </section>

            {EditorComponent && (
                <section className="think-module-settings__section">
                    <h4 className="think-module-settings__section-title">
                        {currentVi.viewType.replace('View', '')} 配置
                    </h4>
                    <EditorComponent
                        module={currentVi}
                        value={correctedViewConfig}
                        onChange={(patch: any) => handleUpdate({ viewConfig: { ...correctedViewConfig, ...patch } })}
                        fieldOptions={fieldOptions}
                        dataStore={dataStore}
                    />
                </section>
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
            className="think-os--settings"
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
        <div className="think-os think-os--settings think-module-settings-panel">
            <div className="think-module-settings-panel__body">
                <ViewInstanceEditor vi={currentModule} />
            </div>
            <div className="think-module-settings-panel__actions">
                <ThinkButton onClick={onClose} variant="secondary" size="sm">关闭</ThinkButton>
                <ThinkButton onClick={handleSave} variant="primary" size="sm">保存设置</ThinkButton>
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
            width={720}
            height={640}
            resizable
            bodyPadding={0}
            bodyStyle={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
            onClose={() => closeFloatingWidget(widgetId)}
        >
            <ModuleSettingsPanel module={module} onClose={() => closeFloatingWidget(widgetId)} />
        </FloatingPanel>
    ));
}

