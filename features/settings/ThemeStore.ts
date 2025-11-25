// src/store/stores/ThemeStore.ts
import type { ThinkSettings, ThemeDefinition, ThemeOverride } from '@/core/types/schema';
import { generateId } from '@core/utils/array';
import { StoreOperations, type StoreKit } from '@core/utils/StoreOperations';

/**
 * ThemeStore - 管理主题相关状态
 * 负责主题的增删改查、批量操作等
 * 
 * 使用StoreOperations工具类减少重复代码
 */
export class ThemeStore {
    private _updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>;
    private _getSettings: () => ThinkSettings;
    
    // 使用通用CRUD操作
    private _themeOperations: StoreKit<ThemeDefinition>;
    private _overrideOperations: StoreKit<ThemeOverride>;

    constructor(
        updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>,
        getSettings: () => ThinkSettings
    ) {
        this._updateSettings = updateSettings;
        this._getSettings = getSettings;
        
        // 初始化通用操作
        this._themeOperations = StoreOperations.createStoreKit<ThemeDefinition>(
            updateSettings,
            getSettings,
            'inputSettings.themes',
            'thm'
        );
        
        this._overrideOperations = StoreOperations.createStoreKit<ThemeOverride>(
            updateSettings,
            getSettings,
            'inputSettings.overrides',
            'ovr'
        );
    }

    // 添加主题 - 使用通用操作，但保留路径重复检查
    public addTheme = async (path: string): Promise<ThemeDefinition | null> => {
        if (!path) {
            console.warn('主题路径不能为空');
            return null;
        }
        
        // 检查路径是否已存在
        const existingThemes = this._themeOperations.getAll();
        if (existingThemes.some(t => t.path === path)) {
            console.warn(`主题路径 "${path}" 已存在`);
            return null;
        }
        
        return await this._themeOperations.add({ path, icon: '' });
    }

    // 更新主题 - 使用通用操作，但保留路径重复检查
    public updateTheme = async (id: string, updates: Partial<ThemeDefinition>): Promise<void> => {
        if (updates.path) {
            const existingThemes = this._themeOperations.getAll();
            if (existingThemes.some(t => t.path === updates.path && t.id !== id)) {
                console.warn(`主题路径 "${updates.path}" 已存在`);
                return;
            }
        }
        
        await this._themeOperations.update(id, updates);
    }

    // 删除主题 - 需要同时清理相关的override
    public deleteTheme = async (id: string): Promise<void> => {
        await this._themeOperations.delete(id);
        
        // 清理相关的override
        const relatedOverrides = this._overrideOperations.findBy(o => o.themeId === id);
        const overrideIds = relatedOverrides.map(o => o.id);
        if (overrideIds.length > 0) {
            await this._overrideOperations.batchDelete(overrideIds);
        }
    }

    // 批量更新主题 - 使用通用批量操作
    public batchUpdateThemes = async (
        themeIds: string[], 
        updates: Partial<ThemeDefinition>
    ): Promise<void> => {
        const updateData = themeIds.map(id => ({ id, data: updates }));
        await this._themeOperations.batchUpdate(updateData);
    }

    // 批量删除主题 - 使用通用批量操作，但要清理相关override
    public batchDeleteThemes = async (themeIds: string[]): Promise<void> => {
        await this._themeOperations.batchDelete(themeIds);
        
        // 清理相关的override
        const themeIdSet = new Set(themeIds);
        const relatedOverrides = this._overrideOperations.findBy(o => themeIdSet.has(o.themeId));
        const overrideIds = relatedOverrides.map(o => o.id);
        if (overrideIds.length > 0) {
            await this._overrideOperations.batchDelete(overrideIds);
        }
    }

    // 批量更新主题状态
    public batchUpdateThemeStatus = async (themeIds: string[], status: 'active' | 'archived') => {
        await this._updateSettings(draft => {
            const themePaths = themeIds.map(id => draft.inputSettings.themes.find(t => t.id === id)?.path).filter(Boolean) as string[];
            
            if (!draft.activeThemePaths) {
                draft.activeThemePaths = [];
            }

            if (status === 'active') {
                themePaths.forEach(path => {
                    if (!draft.activeThemePaths!.includes(path)) {
                        draft.activeThemePaths!.push(path);
                    }
                });
            } else { // 'archived'
                draft.activeThemePaths = draft.activeThemePaths!.filter(path => !themePaths.includes(path));
            }
        });
    }

    // 批量更新主题图标
    public batchUpdateThemeIcon = async (themeIds: string[], icon: string) => {
        await this._updateSettings(draft => {
            themeIds.forEach(id => {
                const theme = draft.inputSettings.themes.find(t => t.id === id);
                if (theme) {
                    theme.icon = icon;
                }
            });
        });
    }

    // 批量设置覆盖状态
    public batchSetOverrideStatus = async (
        cells: Array<{ themeId: string; blockId: string }>,
        status: 'inherit' | 'override' | 'disabled'
    ) => {
        await this._updateSettings(draft => {
            if (status === 'inherit') {
                const cellKeys = new Set(cells.map(c => `${c.themeId}:${c.blockId}`));
                draft.inputSettings.overrides = draft.inputSettings.overrides.filter(
                    o => !cellKeys.has(`${o.themeId}:${o.blockId}`)
                );
            } else { // 'override' or 'disabled'
                cells.forEach(cell => {
                    const existingIndex = draft.inputSettings.overrides.findIndex(
                        o => o.blockId === cell.blockId && o.themeId === cell.themeId
                    );
                    
                    if (existingIndex > -1) {
                        const existingOverride = draft.inputSettings.overrides[existingIndex];
                        if (status === 'disabled') {
                            existingOverride.disabled = true;
                        } else { // 'override'
                           delete existingOverride.disabled;
                        }
                    } else {
                        // Only create new override if not inheriting
                        const newOverride: Partial<ThemeOverride> & { themeId: string; blockId: string } = {
                            themeId: cell.themeId,
                            blockId: cell.blockId,
                        };
                        if (status === 'disabled') {
                            newOverride.disabled = true;
                        }
                        draft.inputSettings.overrides.push({
                            ...newOverride,
                            id: generateId('ovr')
                        } as ThemeOverride);
                    }
                });
            }
        });
    }

    // 更新或插入覆盖配置 - 自定义逻辑，因为涉及复杂的查找和合并
    public upsertOverride = async (overrideData: Omit<ThemeOverride, 'id'>): Promise<ThemeOverride> => {
        const existing = this._overrideOperations.findBy(o => 
            o.blockId === overrideData.blockId && o.themeId === overrideData.themeId
        )[0];
        
        if (existing) {
            // 更新现有的override
            const updated = { ...overrideData };
            await this._overrideOperations.update(existing.id, updated);
            return { ...existing, ...updated };
        } else {
            // 创建新的override
            return await this._overrideOperations.add(overrideData);
        }
    }

    // 删除覆盖配置 - 需要根据blockId和themeId查找
    public deleteOverride = async (blockId: string, themeId: string): Promise<void> => {
        const existing = this._overrideOperations.findBy(o => 
            o.blockId === blockId && o.themeId === themeId
        );
        
        for (const override of existing) {
            await this._overrideOperations.delete(override.id);
        }
    }

    // 批量更新覆盖配置
    public batchUpsertOverrides = async (
        overrides: Array<Omit<ThemeOverride, 'id'>>
    ): Promise<void> => {
        for (const override of overrides) {
            await this.upsertOverride(override);
        }
    }

    // 批量删除覆盖配置
    public batchDeleteOverrides = async (
        selections: Array<{blockId: string; themeId: string}>
    ): Promise<void> => {
        for (const { blockId, themeId } of selections) {
            await this.deleteOverride(blockId, themeId);
        }
    }

    // 获取主题列表 - 使用通用查询操作
    public getThemes = (): ThemeDefinition[] => {
        return this._themeOperations.getAll();
    }

    // 获取单个主题 - 使用通用查询操作
    public getTheme = (id: string): ThemeDefinition | undefined => {
        return this._themeOperations.getById(id);
    }

    // 获取覆盖配置列表 - 使用通用查询操作
    public getOverrides = (): ThemeOverride[] => {
        return this._overrideOperations.getAll();
    }

    // 获取特定主题和块的覆盖配置
    public getOverride = (blockId: string, themeId: string): ThemeOverride | undefined => {
        return this._overrideOperations.findBy(o => 
            o.blockId === blockId && o.themeId === themeId
        )[0];
    }

    // 新增：根据主题ID获取所有相关的覆盖配置
    public getOverridesByTheme = (themeId: string): ThemeOverride[] => {
        return this._overrideOperations.findBy(o => o.themeId === themeId);
    }

    // 新增：根据块ID获取所有相关的覆盖配置
    public getOverridesByBlock = (blockId: string): ThemeOverride[] => {
        return this._overrideOperations.findBy(o => o.blockId === blockId);
    }

    // 新增：检查主题是否存在
    public themeExists = (id: string): boolean => {
        return this._themeOperations.exists(id);
    }

    // 新增：检查路径是否已被使用
    public isPathUsed = (path: string, excludeId?: string): boolean => {
        const themes = this._themeOperations.findBy(t => t.path === path);
        if (excludeId) {
            return themes.some(t => t.id !== excludeId);
        }
        return themes.length > 0;
    }

    // 新增：获取主题数量
    public getThemeCount = (): number => {
        return this._themeOperations.count();
    }
}
