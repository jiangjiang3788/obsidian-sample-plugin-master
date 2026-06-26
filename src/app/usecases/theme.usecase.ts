// src/app/usecases/theme.usecase.ts
/**
 * ============================================================================
 * ThemeUseCase - 主题相关用例 (Facade 层)
 * ============================================================================
 * 
 * 【S6 架构约束 - 强制性规范】
 * 
 * 主题写操作只能走 useCases.theme.*；ThemeMatrix 运行时已移除
 * ⚠️ UI 不得直接 import slice actions / SettingsRepository
 * ⚠️ group / layout 的约束不在此处处理（只管 theme）
 * ⛔ 禁止使用全局单例（禁止 getAppStoreInstance）
 * 
 * 【数据边界】
 * - settings 中只存"主题定义 / 映射规则"等业务数据
 * - UI 临时态（选中态 / 展开态 / hover / editing）不得写入 settings
 * - UI 临时态应由组件 state 或 UI slice 管理
 * 
 * 【调用链】
 * UI 
 *   → useCases.theme.* (本文件)
 *     → Zustand Store actions (theme.slice.ts)
 *       → SettingsRepository.update()
 * 
 * Role: UseCase (应用层 Facade)
 * 
 * Do:
 * - 封装主题相关的业务意图
 * - 调用 Zustand Store 的 actions
 * - 统一错误处理
 * - 作为主题设置 UI 的唯一写入口
 * 
 * Don't:
 * - 直接操作 SettingsRepository
 * - 持有 UI 相关逻辑
 * - 直接修改 settings 数据结构
 * - 管理 UI 临时态（选中态、展开态等）
 * ============================================================================
 */

import type { ThemeDefinition } from '@core/public';
import type { ActiveStatus } from '@core/public';
import type { AppStoreApi } from './index';
import { devError } from '@core/public';

/**
 * 主题用例类
 * 
 * 【S6 唯一写入口】
 * UI 通过 UseCases 调用主题操作，不直接访问 Store 或 SettingsRepository
 * 
 * 支持的写操作：
 * - addTheme: 添加主题
 * - updateTheme: 更新主题
 * - deleteTheme: 删除主题
 * - reorderThemeSiblings: 调整同级主题顺序
 * - batchUpdateThemes: 批量更新主题
 * - batchDeleteThemes: 批量删除主题
 * - batchUpdateThemeStatus: 批量更新主题状态
 * - batchUpdateThemeIcon: 批量更新主题图标
 */
export class ThemeUseCase {
    private store: AppStoreApi;

    constructor(store: AppStoreApi) {
        this.store = store;
    }

    // ============== Theme CRUD ==============

    /**
     * 添加主题
     * @param path 主题路径
     * @returns 新创建的主题定义，失败返回 null
     */
    async addTheme(path: string): Promise<ThemeDefinition | null> {
        try {
            const state = this.store.getState();
            
            if (!state.isInitialized) {
                devError('[ThemeUseCase] Store 未初始化');
                return null;
            }
            
            return await state.addTheme(path);
        } catch (error) {
            devError('[ThemeUseCase] addTheme 失败:', error);
            throw error;
        }
    }

    /**
     * 更新主题
     * @param id 主题ID
     * @param updates 更新内容
     */
    async updateTheme(id: string, updates: Partial<ThemeDefinition>): Promise<void> {
        try {
            const state = this.store.getState();
            
            if (!state.isInitialized) {
                devError('[ThemeUseCase] Store 未初始化');
                return;
            }
            
            await state.updateTheme(id, updates);
        } catch (error) {
            devError('[ThemeUseCase] updateTheme 失败:', error);
            throw error;
        }
    }

    /**
     * 删除主题
     * @param id 主题ID
     */
    async deleteTheme(id: string): Promise<void> {
        try {
            const state = this.store.getState();
            
            if (!state.isInitialized) {
                devError('[ThemeUseCase] Store 未初始化');
                return;
            }
            
            await state.deleteTheme(id);
        } catch (error) {
            devError('[ThemeUseCase] deleteTheme 失败:', error);
            throw error;
        }
    }


    /**
     * 调整同级主题顺序
     * @param orderedThemeIds 调整后的同级主题 ID 顺序
     */
    async reorderThemeSiblings(orderedThemeIds: string[], parentKey?: string): Promise<void> {
        try {
            const state = this.store.getState();

            if (!state.isInitialized) {
                devError('[ThemeUseCase] Store 未初始化');
                return;
            }

            await state.reorderThemeSiblings(orderedThemeIds, parentKey);
        } catch (error) {
            devError('[ThemeUseCase] reorderThemeSiblings 失败:', error);
            throw error;
        }
    }

    // ============== 批量操作 ==============

    /**
     * 批量更新主题
     * @param themeIds 主题ID列表
     * @param updates 更新内容
     */
    async batchUpdateThemes(themeIds: string[], updates: Partial<ThemeDefinition>): Promise<void> {
        try {
            const state = this.store.getState();
            
            if (!state.isInitialized) return;
            
            await state.batchUpdateThemes(themeIds, updates);
        } catch (error) {
            devError('[ThemeUseCase] batchUpdateThemes 失败:', error);
            throw error;
        }
    }

    /**
     * 批量删除主题
     * @param themeIds 主题ID列表
     */
    async batchDeleteThemes(themeIds: string[]): Promise<void> {
        try {
            const state = this.store.getState();
            
            if (!state.isInitialized) return;
            
            await state.batchDeleteThemes(themeIds);
        } catch (error) {
            devError('[ThemeUseCase] batchDeleteThemes 失败:', error);
            throw error;
        }
    }

    /**
     * 批量更新主题状态（激活/归档）
     * @param themeIds 主题ID列表
     * @param status 目标状态
     */
    async batchUpdateThemeStatus(themeIds: string[], status: ActiveStatus): Promise<void> {
        try {
            const state = this.store.getState();
            
            if (!state.isInitialized) return;
            
            await state.batchUpdateThemeStatus(themeIds, status);
        } catch (error) {
            devError('[ThemeUseCase] batchUpdateThemeStatus 失败:', error);
            throw error;
        }
    }

    /**
     * 批量更新主题图标
     * @param themeIds 主题ID列表
     * @param icon 图标
     */
    async batchUpdateThemeIcon(themeIds: string[], icon: string): Promise<void> {
        try {
            const state = this.store.getState();
            
            if (!state.isInitialized) return;
            
            await state.batchUpdateThemeIcon(themeIds, icon);
        } catch (error) {
            devError('[ThemeUseCase] batchUpdateThemeIcon 失败:', error);
            throw error;
        }
    }

    // ============== 查询方法 ==============
    // 注意：查询方法不涉及写操作，UI 可以直接使用 Zustand selector 读取
    // 这里提供的查询方法是为了保持 API 一致性

    /**
     * 获取所有主题
     * @returns 主题列表
     */
    getThemes(): ThemeDefinition[] {
        try {
            const state = this.store.getState();
            return state.getThemes();
        } catch (error) {
            devError('[ThemeUseCase] getThemes 失败:', error);
            return [];
        }
    }

    /**
     * 获取单个主题
     * @param id 主题ID
     * @returns 主题定义
     */
    getTheme(id: string): ThemeDefinition | undefined {
        try {
            const state = this.store.getState();
            return state.getTheme(id);
        } catch (error) {
            devError('[ThemeUseCase] getTheme 失败:', error);
            return undefined;
        }
    }

}

/**
 * 创建主题用例实例
 * @param store Zustand Store 实例
 * @returns ThemeUseCase 实例
 */
export function createThemeUseCase(store: AppStoreApi): ThemeUseCase {
    return new ThemeUseCase(store);
}