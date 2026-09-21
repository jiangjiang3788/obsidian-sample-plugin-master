// src/features/dashboard/ui/ModuleSettingsModal.tsx
/** @jsxImportSource preact */
/**
 * 【S5 术语统一】
 * - 所有 View 写操作统一通过 useCases.viewInstance.*
 * - 禁止 features 层直接 import viewinstance.usecase
 */

import { useMemo, useRef } from 'preact/hooks';
import {
  ThinkButton,
  ThinkCheckbox,
} from '@shared/ui/public';
import { VIEW_OPTIONS, ViewName, getAllFields } from '@core/types/public';
import { getViewDefaultConfig, getViewLabel, normalizeViewDateRole, type ViewDateRole } from '@core/view/public';
import { getFieldLabel, getFieldCategoryLabel } from '@core/fields/public';
import { normalizeDisplayFields, normalizeViewFilters, normalizeViewGroupFields, normalizeViewSort } from '@core/view/public';
import type { FilterRule, ViewInstance } from '@core/types/public';
import { getViewEditorComponent } from '@features/settings/views/editors/registry';
import { useSelector, makeSelectViewInstanceById, useDataStore, useUseCases } from '@/app/public';
import {
  FieldManager,
  FormField,
  Modal,
  SimpleSelect,
} from '@shared/ui/public';
import { useSaveHandler } from '@shared/patterns/public';
import { RuleBuilder } from '@features/settings/views/editors/RuleBuilder';
import { CommonFilterPanel, splitDefaultQuickFilterRules } from '@features/settings/views/editors/CommonFilterPanel';
import { FloatingPanel } from '@/app/public';
import { closeFloatingWidget, openFloatingWidget } from '@/app/public';
import { createViewSettingsWriteBarrier, type ViewSettingsWriteBarrier } from './viewSettingsWriteBarrier';

const VIEW_DATE_ROLE_OPTIONS: Array<{ value: ViewDateRole; label: string }> = [
    { value: 'default', label: '默认时间（记录日期）' },
    { value: 'task-scheduled', label: '计划时间' },
    { value: 'task-due', label: '截止时间' },
    { value: 'task-completed', label: '完成时间' },
    { value: 'task-actual', label: '实际执行时间（任务计时记录）' },
];

// [S5 术语统一] 视图设置编辑器组件 - 通过 useCases.viewInstance 调用
function ViewInstanceEditor({ vi, onWriteStarted }: { vi: ViewInstance; onWriteStarted: (operation: Promise<void>) => void }) {
    // 从 Context 获取 DataStore
    const dataStore = useDataStore();
    // S5: 通过 useUseCases 获取 ViewInstanceUseCase
    const useCases = useUseCases();
    
    // 从store中获取最新的viewInstance状态
    const currentVi = useSelector(makeSelectViewInstanceById(vi.id)) || vi;
    const fieldOptions = useMemo(() => getAllFields(dataStore?.queryItems() || []), [dataStore]);
    const EditorComponent = getViewEditorComponent(currentVi.viewType);

    const correctedViewConfig = useMemo(() => {
        if (currentVi.viewConfig && typeof (currentVi.viewConfig as any).categories === 'object') return currentVi.viewConfig;
        if (currentVi.viewConfig && (currentVi.viewConfig as any).viewConfig) return (currentVi.viewConfig as any).viewConfig;
        return currentVi.viewConfig || {};
    }, [currentVi.viewConfig]);
    const currentDateRole: ViewDateRole = normalizeViewDateRole(correctedViewConfig.dateRole) ?? 'default';

    // 所有 ViewInstance 修改仍走唯一 UseCase；同时把真实写盘 Promise 交给保存 barrier。
    const handleUpdate = (updates: Partial<ViewInstance>) => {
        onWriteStarted(useCases.viewInstance.updateView(currentVi.id, updates));
    };

    // 准备选项数据
    const viewTypeOptions = useMemo(() =>
        VIEW_OPTIONS.map(v => ({ value: v, label: getViewLabel(v) })),
    []);

    const { quickRules, advancedRules } = useMemo(
        () => splitDefaultQuickFilterRules(currentVi.filters || []),
        [currentVi.filters]
    );
    const advancedFilterCount = advancedRules.length;

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
                                onChange={val => handleUpdate({
                                    viewType: val as ViewName,
                                    // dateRole is a cross-view query semantic, so switching the renderer
                                    // must not silently change which business time fact the toolbar filters.
                                    viewConfig: { ...(getViewDefaultConfig(val) || {}), dateRole: currentDateRole },
                                })}
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

                    <FormField
                        label="时间依据"
                        help="控制栏的年/季/月/周/日范围会按这里选择的业务时间筛选当前视图。计划/截止/完成只匹配任务；实际执行时间匹配任务计时记录。"
                    >
                        <SimpleSelect
                            value={currentDateRole}
                            options={VIEW_DATE_ROLE_OPTIONS}
                            onChange={value => handleUpdate({
                                viewConfig: {
                                    ...correctedViewConfig,
                                    dateRole: normalizeViewDateRole(value) ?? 'default',
                                },
                            })}
                            fullWidth
                        />
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
                <h4 className="think-module-settings__section-title">筛选</h4>
                <CommonFilterPanel
                    dataStore={dataStore}
                    filters={currentVi.filters || []}
                    fieldOptions={fieldOptions}
                    onChange={(rows: FilterRule[]) => handleUpdate({ filters: normalizeViewFilters(rows) })}
                    compact
                    showHeader={false}
                />

                <div className="think-filter-rule-section">
                    <div className="think-filter-rule-section__head">
                        <span>高级规则</span>
                        <span className="think-filter-rule-section__meta">{advancedFilterCount} 条</span>
                    </div>
                    <RuleBuilder
                        title="筛选"
                        mode="filter"
                        rows={advancedRules}
                        fieldOptions={fieldOptions}
                        onChange={(rows: any) => handleUpdate({ filters: normalizeViewFilters([...quickRules, ...rows]) })}
                        dataStore={dataStore}
                        showHeader={false}
                    />
                </div>
            </section>

            <section className="think-module-settings__section">
                <h4 className="think-module-settings__section-title">排序</h4>
                <RuleBuilder
                    title="排序"
                    mode="sort"
                    rows={currentVi.sort || []}
                    fieldOptions={fieldOptions}
                    onChange={(rows: any) => handleUpdate({ sort: normalizeViewSort(rows) })}
                    dataStore={dataStore}
                    showHeader={false}
                />
            </section>

            {EditorComponent && (
                <section className="think-module-settings__section think-module-settings__section--view-editor">
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
    const writeBarrierRef = useRef<ViewSettingsWriteBarrier | null>(null);
    if (!writeBarrierRef.current) writeBarrierRef.current = createViewSettingsWriteBarrier();

    // 保存按钮必须等待本窗口触发的全部 SettingsRepository 写入真正完成。
    const handleSave = useSaveHandler(async () => {
        await writeBarrierRef.current!.flush();
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
            <ViewInstanceEditor vi={currentModule} onWriteStarted={(operation) => writeBarrierRef.current!.track(operation)} />
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
    const writeBarrierRef = useRef<ViewSettingsWriteBarrier | null>(null);
    if (!writeBarrierRef.current) writeBarrierRef.current = createViewSettingsWriteBarrier();

    const handleSave = useSaveHandler(async () => {
        await writeBarrierRef.current!.flush();
        onClose();
    }, {
        successMessage: `已保存视图 "${module.title}" 的设置`,
        errorMessage: '保存设置失败'
    });

    return (
        <div className="think-os think-os--settings think-module-settings-panel">
            <div className="think-module-settings-panel__body">
                <ViewInstanceEditor vi={currentModule} onWriteStarted={(operation) => writeBarrierRef.current!.track(operation)} />
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

