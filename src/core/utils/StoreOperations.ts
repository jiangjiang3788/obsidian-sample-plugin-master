// src/core/utils/StoreOperations.ts
import type { ThinkSettings } from '@core/types/domain/schema';
import { generateId } from '@core/utils/array';
import { arrayUtils } from '@core/utils/array';

/**
 * 通用Store操作工具类
 * 提供标准化的CRUD操作，减少各Store中的重复代码
 */
export class StoreOperations {
    /**
     * 通用的数组更新操作
     * 支持深度路径访问（如 'inputSettings.themes'）
     */
    static async updateArray<T extends { id: string }>(
        updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>,
        arrayPath: string,
        operation: (array: T[]) => T[]
    ): Promise<void> {
        await updateSettings(draft => {
            // 通过路径访问嵌套属性
            const keys = arrayPath.split('.');
            let current: any = draft;
            
            // 导航到目标数组的父对象
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            
            const lastKey = keys[keys.length - 1];
            if (!current[lastKey]) {
                current[lastKey] = [];
            }
            
            // 执行数组操作
            current[lastKey] = operation(current[lastKey]);
        });
    }

    /**
     * 创建标准化的CRUD操作集合
     * 返回一套完整的增删改查方法
     */
    static createCrudOperations<T extends { id: string }>(
        updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>,
        arrayPath: string,
        idPrefix: string = 'item'
    ) {
        return {
            /**
             * 添加新项目
             */
            add: async (item: Omit<T, 'id'>): Promise<T> => {
                const newItem = { ...item, id: generateId(idPrefix) } as T;
                await StoreOperations.updateArray<T>(updateSettings, arrayPath, array => [
                    ...array,
                    newItem
                ]);
                return newItem;
            },

            /**
             * 更新现有项目
             */
            update: async (id: string, updates: Partial<T>): Promise<void> => {
                await StoreOperations.updateArray<T>(updateSettings, arrayPath, array =>
                    arrayUtils.updateById(array, id, updates)
                );
            },

            /**
             * 删除单个项目
             */
            delete: async (id: string): Promise<void> => {
                await StoreOperations.updateArray<T>(updateSettings, arrayPath, array =>
                    arrayUtils.removeByIds(array, [id])
                );
            },

            /**
             * 批量删除项目
             */
            batchDelete: async (ids: string[]): Promise<void> => {
                await StoreOperations.updateArray<T>(updateSettings, arrayPath, array =>
                    arrayUtils.removeByIds(array, ids)
                );
            },

            /**
             * 批量更新项目
             */
            batchUpdate: async (updates: Array<{ id: string; data: Partial<T> }>): Promise<void> => {
                await StoreOperations.updateArray<T>(updateSettings, arrayPath, array => {
                    let result = [...array];
                    updates.forEach(({ id, data }) => {
                        result = arrayUtils.updateById(result, id, data);
                    });
                    return result;
                });
            }
        };
    }

    /**
     * 创建基础查询操作集合
     * 提供常用的查询方法
     */
    static createQueryOperations<T extends { id: string }>(
        getSettings: () => ThinkSettings,
        arrayPath: string
    ) {
        const getArray = (): T[] => {
            const keys = arrayPath.split('.');
            let current: any = getSettings();
            
            for (const key of keys) {
                if (!current[key]) {
                    return [];
                }
                current = current[key];
            }
            
            return Array.isArray(current) ? current : [];
        };

        return {
            /**
             * 获取所有项目
             */
            getAll: (): T[] => getArray(),

            /**
             * 根据ID获取单个项目
             */
            getById: (id: string): T | undefined => {
                return getArray().find(item => item.id === id);
            },

            /**
             * 根据条件查找项目
             */
            findBy: (predicate: (item: T) => boolean): T[] => {
                return getArray().filter(predicate);
            },

            /**
             * 检查项目是否存在
             */
            exists: (id: string): boolean => {
                return getArray().some(item => item.id === id);
            },

            /**
             * 获取项目数量
             */
            count: (): number => getArray().length
        };
    }

    /**
     * 创建完整的Store操作套件
     * 包含CRUD和查询操作
     */
    static createStoreKit<T extends { id: string }>(
        updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>,
        getSettings: () => ThinkSettings,
        arrayPath: string,
        idPrefix: string = 'item'
    ) {
        const crud = this.createCrudOperations<T>(updateSettings, arrayPath, idPrefix);
        const query = this.createQueryOperations<T>(getSettings, arrayPath);

        return {
            ...crud,
            ...query
        };
    }
}

/**
 * 用于处理有父子关系的项目（如 parentId）
 */
export class HierarchicalStoreOperations extends StoreOperations {
    /**
     * 移动项目到新的父级下
     */
    static async moveToParent<T extends { id: string; parentId?: string | null }>(
        updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>,
        arrayPath: string,
        itemId: string,
        newParentId: string | null
    ): Promise<void> {
        await StoreOperations.updateArray<T>(updateSettings, arrayPath, array =>
            arrayUtils.updateById(array, itemId, { parentId: newParentId } as Partial<T>)
        );
    }

    /**
     * 获取子项目
     */
    static createHierarchicalQueries<T extends { id: string; parentId?: string | null }>(
        getSettings: () => ThinkSettings,
        arrayPath: string
    ) {
        const baseQueries = StoreOperations.createQueryOperations<T>(getSettings, arrayPath);
        
        return {
            ...baseQueries,
            
            /**
             * 根据父ID获取子项目
             */
            getChildren: (parentId: string | null): T[] => {
                return baseQueries.getAll().filter(item => item.parentId === parentId);
            },

            /**
             * 获取顶级项目（没有父级的项目）
             */
            getTopLevel: (): T[] => {
                return baseQueries.getAll().filter(item => !item.parentId);
            },

            /**
             * 检查是否有子项目
             */
            hasChildren: (parentId: string): boolean => {
                return baseQueries.getAll().some(item => item.parentId === parentId);
            }
        };
    }
}

// 导出类型定义，方便Store使用
export type CrudOperations<T extends { id: string }> = ReturnType<typeof StoreOperations.createCrudOperations<T>>;
export type QueryOperations<T extends { id: string }> = ReturnType<typeof StoreOperations.createQueryOperations<T>>;
export type StoreKit<T extends { id: string }> = ReturnType<typeof StoreOperations.createStoreKit<T>>;
