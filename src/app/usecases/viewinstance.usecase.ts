// src/app/usecases/viewinstance.usecase.ts
import type { ViewInstance, ViewName } from '@core/types/public';
import type { AppStoreApi } from './AppStoreApi';
import {
  addDisplayField,
  moveDisplayField,
  normalizeDisplayFields,
  normalizeViewFilters,
  normalizeViewGroupFields,
  normalizeViewInstanceDomain,
  normalizeViewSort,
  removeDisplayField,
} from '@core/view/public';
import { devError, generateId } from '@core/utils/public';

/**
 * ViewInstanceUseCase - 视图实例 CRUD + 视图配置字段操作
 * 负责在 settings 中创建/更新/删除 viewInstances。
 *
 * 字段显示顺序的唯一真源是 ViewInstance.fields。
 * 设置弹窗和 Excel 视图内字段栏都应该走这里，不要为 Excel 单独维护一份字段顺序。
 */
export class ViewInstanceUseCase {
    private store: AppStoreApi;

    constructor(store: AppStoreApi) {
        this.store = store;
    }

    async createView(title: string, viewType: ViewName = 'StatisticsView'): Promise<ViewInstance | null> {
        try {
            const state = this.store.getState();
            if (!state.isInitialized) {
                devError('[ViewInstanceUseCase] Store 未初始化');
                return null;
            }

            const newVi: ViewInstance = {
                id: generateId('vi'),
                parentId: null,
                title,
                viewType,
                viewConfig: {},
                fields: [],
                groupFields: [],
                filters: [],
                sort: [],
                collapsed: false,
            };

            await state.updateSettings(draft => {
                if (!draft.viewInstances) draft.viewInstances = [];
                draft.viewInstances.push(newVi);
            });

            return newVi;
        } catch (error) {
            devError('[ViewInstanceUseCase] createView 失败:', error);
            throw error;
        }
    }

    async updateView(id: string, updates: Partial<ViewInstance>): Promise<void> {
        try {
            const state = this.store.getState();
            if (!state.isInitialized) {
                devError('[ViewInstanceUseCase] Store 未初始化');
                return;
            }

            await state.updateSettings(draft => {
                if (!draft.viewInstances) return;
                const vi = draft.viewInstances.find(v => v.id === id);
                if (vi) {
                    const normalizedUpdates: Partial<ViewInstance> = { ...updates };
                    if (updates.fields) {
                        normalizedUpdates.fields = normalizeDisplayFields(updates.fields, { includeUnknown: true });
                    }
                    if (updates.groupFields) {
                        normalizedUpdates.groupFields = normalizeViewGroupFields(updates.groupFields);
                    }
                    if (updates.filters) {
                        normalizedUpdates.filters = normalizeViewFilters(updates.filters);
                    }
                    if (updates.sort) {
                        normalizedUpdates.sort = normalizeViewSort(updates.sort);
                    }
                    Object.assign(vi, normalizeViewInstanceDomain({ ...vi, ...normalizedUpdates } as ViewInstance));
                }
            });
        } catch (error) {
            devError('[ViewInstanceUseCase] updateView 失败:', error);
            throw error;
        }
    }

    async setDisplayFields(id: string, fields: string[], availableFields?: string[]): Promise<void> {
        await this.updateDisplayFields(id, currentFields => normalizeDisplayFields(fields, {
            availableFields,
            includeUnknown: true,
            fallbackFields: currentFields,
        }));
    }

    async addDisplayField(id: string, field: string, availableFields?: string[]): Promise<void> {
        await this.updateDisplayFields(id, currentFields => addDisplayField(currentFields, field, {
            availableFields,
            includeUnknown: true,
        }));
    }

    async removeDisplayField(id: string, field: string, availableFields?: string[]): Promise<void> {
        await this.updateDisplayFields(id, currentFields => removeDisplayField(currentFields, field, {
            availableFields,
            includeUnknown: true,
        }));
    }

    async moveDisplayField(id: string, fromIndex: number, toIndex: number, availableFields?: string[]): Promise<void> {
        await this.updateDisplayFields(id, currentFields => moveDisplayField(currentFields, fromIndex, toIndex, {
            availableFields,
            includeUnknown: true,
        }));
    }

    async updateViewConfig(id: string, patch: Record<string, any>): Promise<void> {
        try {
            const state = this.store.getState();
            if (!state.isInitialized) {
                devError('[ViewInstanceUseCase] Store 未初始化');
                return;
            }

            await state.updateSettings(draft => {
                if (!draft.viewInstances) return;
                const vi = draft.viewInstances.find(v => v.id === id);
                if (!vi) return;
                vi.viewConfig = {
                    ...(vi.viewConfig || {}),
                    ...patch,
                };
            });
        } catch (error) {
            devError('[ViewInstanceUseCase] updateViewConfig 失败:', error);
            throw error;
        }
    }

    async updateExcelViewConfig(id: string, excelPatch: Record<string, any>): Promise<void> {
        try {
            const state = this.store.getState();
            if (!state.isInitialized) {
                devError('[ViewInstanceUseCase] Store 未初始化');
                return;
            }

            await state.updateSettings(draft => {
                if (!draft.viewInstances) return;
                const vi = draft.viewInstances.find(v => v.id === id);
                if (!vi) return;
                const currentConfig = vi.viewConfig || {};
                const currentExcelConfig = currentConfig.excel || {};
                vi.viewConfig = {
                    ...currentConfig,
                    excel: {
                        ...currentExcelConfig,
                        ...excelPatch,
                    },
                };
            });
        } catch (error) {
            devError('[ViewInstanceUseCase] updateExcelViewConfig 失败:', error);
            throw error;
        }
    }

    private async updateDisplayFields(id: string, updater: (currentFields: string[]) => string[]): Promise<void> {
        try {
            const state = this.store.getState();
            if (!state.isInitialized) {
                devError('[ViewInstanceUseCase] Store 未初始化');
                return;
            }

            await state.updateSettings(draft => {
                if (!draft.viewInstances) return;
                const vi = draft.viewInstances.find(v => v.id === id);
                if (!vi) return;
                vi.fields = normalizeDisplayFields(updater(vi.fields || []), { includeUnknown: true });
            });
        } catch (error) {
            devError('[ViewInstanceUseCase] updateDisplayFields 失败:', error);
            throw error;
        }
    }

    async deleteView(id: string): Promise<void> {
        try {
            const state = this.store.getState();
            if (!state.isInitialized) {
                devError('[ViewInstanceUseCase] Store 未初始化');
                return;
            }

            await state.updateSettings(draft => {
                if (!draft.viewInstances) return;
                draft.viewInstances = draft.viewInstances.filter(v => v.id !== id);

                // 同时从所有 layout 中移除该 view 的引用
                if (draft.layouts) {
                    draft.layouts.forEach((layout: any) => {
                        if (layout.viewInstanceIds) {
                            layout.viewInstanceIds = layout.viewInstanceIds.filter((vid: string) => vid !== id);
                        }
                        if (layout.viewPlacements) {
                            delete layout.viewPlacements[id];
                        }
                    });
                }
            });
        } catch (error) {
            devError('[ViewInstanceUseCase] deleteView 失败:', error);
            throw error;
        }
    }
}

export function createViewInstanceUseCase(store: AppStoreApi): ViewInstanceUseCase {
    return new ViewInstanceUseCase(store);
}
