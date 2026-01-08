// src/store/stores/ViewInstanceStore.ts
/**
 * @deprecated 【S5 已移除】此独立 Store 已被 Zustand slices + UseCases 取代。
 * 禁止使用此文件，请使用：
 * - useCases.layout.addView / updateView / deleteView (写操作)
 * - useZustandAppStore(state => state.settings.viewInstances) (读操作)
 * 
 * 任何尝试实例化此类都会直接抛出异常。
 */

import type { ThinkSettings, ViewInstance } from '@/core/types/schema';

const DEPRECATED_ERROR = 'ViewInstanceStore is deprecated. Use Zustand slices + useCases.layout instead. See S5 migration notes.';

/**
 * @deprecated Use Zustand viewInstance.slice.ts + layout.usecase.ts instead
 * @throws Error always - this store is disabled
 */
export class ViewInstanceStore {
    constructor(
        updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>,
        getSettings: () => ThinkSettings
    ) {
        throw new Error(DEPRECATED_ERROR);
    }

    // 所有方法都不会被执行，因为构造函数会抛出异常
    public addViewInstance = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public updateViewInstance = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public deleteViewInstance = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public moveViewInstance = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public duplicateViewInstance = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public getViewInstances = (): never => { throw new Error(DEPRECATED_ERROR); };
    public getViewInstance = (): never => { throw new Error(DEPRECATED_ERROR); };
    public getViewInstancesByParent = (): never => { throw new Error(DEPRECATED_ERROR); };
    public batchUpdateViewInstances = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
    public batchDeleteViewInstances = async (): Promise<never> => { throw new Error(DEPRECATED_ERROR); };
}

// ============== 原始实现已移除，详见 S5 迁移说明 ==============
