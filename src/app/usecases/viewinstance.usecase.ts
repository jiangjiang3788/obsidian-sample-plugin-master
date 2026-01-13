// src/app/usecases/viewinstance.usecase.ts
import type { ViewInstance, ViewName } from '@/core/types/schema';
import type { AppStoreApi } from './index';
import { generateId } from '@/shared/utils/id';

/**
 * ViewInstanceUseCase - 视图实例 CRUD
 * 负责在 settings 中创建/更新/删除 viewInstances
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
                console.error('[ViewInstanceUseCase] Store 未初始化');
                return null;
            }

            const newVi: ViewInstance = {
                id: generateId('vi'),
                title,
                viewType,
                viewConfig: {},
                fields: [],
                groupFields: [],
                filters: [],
                sort: [],
                collapsed: false,
            } as ViewInstance;

            await state.updateSettings(draft => {
                if (!draft.viewInstances) draft.viewInstances = [];
                draft.viewInstances.push(newVi);
            });

            return newVi;
        } catch (error) {
            console.error('[ViewInstanceUseCase] createView 失败:', error);
            throw error;
        }
    }

    async updateView(id: string, updates: Partial<ViewInstance>): Promise<void> {
        try {
            const state = this.store.getState();
            if (!state.isInitialized) {
                console.error('[ViewInstanceUseCase] Store 未初始化');
                return;
            }

            await state.updateSettings(draft => {
                if (!draft.viewInstances) return;
                const vi = draft.viewInstances.find(v => v.id === id);
                if (vi) Object.assign(vi, updates);
            });
        } catch (error) {
            console.error('[ViewInstanceUseCase] updateView 失败:', error);
            throw error;
        }
    }

    async deleteView(id: string): Promise<void> {
        try {
            const state = this.store.getState();
            if (!state.isInitialized) {
                console.error('[ViewInstanceUseCase] Store 未初始化');
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
                    });
                }
            });
        } catch (error) {
            console.error('[ViewInstanceUseCase] deleteView 失败:', error);
            throw error;
        }
    }
}

export function createViewInstanceUseCase(store: AppStoreApi): ViewInstanceUseCase {
    return new ViewInstanceUseCase(store);
}
