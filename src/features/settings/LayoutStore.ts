// src/store/stores/LayoutStore.ts
/**
 * @deprecated 【S5 已移除】此独立 Store 已被 Zustand slices + UseCases 取代。
 * 禁止使用此文件，请使用：
 * - useCases.layout.* (写操作)
 * - useZustandAppStore(state => state.settings.layouts) (读操作)
 * 
 * 任何尝试实例化此类都会直接抛出异常。
 */

import type { ThinkSettings, Layout } from '@/core/types/schema';

const DEPRECATED_ERROR = 'LayoutStore is deprecated. Use Zustand slices + useCases instead. See S5 migration notes.';

/**
 * @deprecated Use Zustand layout.slice.ts + layout.usecase.ts instead
 * @throws Error always - this store is disabled
 */
export class LayoutStore {
    constructor(
        updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>,
        getSettings: () => ThinkSettings
    ) {
        throw new Error(DEPRECATED_ERROR);
    }

    // 所有方法都不会被执行，因为构造函数会抛出异常
    public addLayout = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public updateLayout = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public deleteLayout = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public moveLayout = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public duplicateLayout = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public batchUpdateLayouts = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public batchDeleteLayouts = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public moveToParent = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public addViewInstanceToLayout = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public removeViewInstanceFromLayout = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public reorderViewInstances = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public getLayouts = (): never => { throw new Error(DEPRECATED_ERROR); };
    public getLayout = (): never => { throw new Error(DEPRECATED_ERROR); };
    public getLayoutsByParent = (): never => { throw new Error(DEPRECATED_ERROR); };
    public getTopLevelLayouts = (): never => { throw new Error(DEPRECATED_ERROR); };
    public hasChildren = (): never => { throw new Error(DEPRECATED_ERROR); };
    public getLayoutViewInstances = (): never => { throw new Error(DEPRECATED_ERROR); };
    public layoutExists = (): never => { throw new Error(DEPRECATED_ERROR); };
    public findLayoutsByName = (): never => { throw new Error(DEPRECATED_ERROR); };
    public getLayoutCount = (): never => { throw new Error(DEPRECATED_ERROR); };
    public getLayoutsByDisplayMode = (): never => { throw new Error(DEPRECATED_ERROR); };
}

// ============== 原始实现已移除，详见 S5 迁移说明 ==============
