/**
 * ThemeMatrix 业务逻辑服务
 */
import { type AppStore } from '@/app/AppStore';
import { type ThemeDefinition, ThemeOverride, BlockTemplate } from '@/core/types/schema';
import { type ExtendedTheme, BatchOperationType, ThemeTreeNode } from '@core/theme-matrix/types';
import { ThemeManager } from '@features/theme/ThemeManager';
import { 
    normalizePath,
    validatePathCharacters 
} from '@/core/theme-matrix/themePathParser';
import {
    createOverridesMap,
    toggleThemeSelection,
    filterThemes,
    sortThemes
} from '@/core/theme-matrix/themeOperations';
import { buildThemeTree, findNodeInTree, getDescendantIds } from '@/core/theme-matrix/themeTreeBuilder';

/**
 * ThemeMatrix 服务配置
 */
export interface ThemeMatrixServiceConfig {
    /** 应用状态存储 */
    appStore: AppStore;
    /** 主题管理器实例 */
    themeManager?: ThemeManager;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
    /** 成功数量 */
    success: number;
    /** 失败数量 */
    failed: number;
    /** 错误信息 */
    errors: string[];
}

/**
 * ThemeMatrix 业务逻辑服务
 * 封装所有主题矩阵相关的业务逻辑
 */
export class ThemeMatrixService {
    private appStore: AppStore;
    private themeManager: ThemeManager;
    
    constructor(config: ThemeMatrixServiceConfig) {
        this.appStore = config.appStore;
        this.themeManager = config.themeManager || new ThemeManager();
    }
    
    /**
     * 获取扩展的主题信息
     * @param themes - 基础主题列表
     * @returns 扩展主题列表
     */
    getExtendedThemes(themes: ThemeDefinition[]): ExtendedTheme[] {
        return themes.map(theme => {
            const themeData = this.themeManager.getThemeByPath(theme.path);
            // 如果主题已经有 source 属性，保留它；否则根据 themeData 判断
            const source = (theme as any).source || 
                          (themeData?.source) || 
                          'predefined';
            return {
                ...theme,
                status: themeData?.status || 'active',
                source: source as 'predefined' | 'discovered',
                usageCount: themeData?.usageCount || 0,
                lastUsed: themeData?.lastUsed
            } as ExtendedTheme;
        });
    }
    
    /**
     * 添加新主题
     * @param path - 主题路径
     * @returns 添加结果
     */
    addTheme(path: string): { success: boolean; message?: string } {
        // 规范化路径
        const normalizedPath = normalizePath(path);
        
        // 验证路径
        const validation = validatePathCharacters(normalizedPath);
        if (!validation.valid) {
            return { success: false, message: validation.message };
        }
        
        // 检查是否已存在
        const themes = this.appStore.getState().settings.inputSettings.themes;
        if (themes.some(t => t.path === normalizedPath)) {
            return { success: false, message: '主题路径已存在' };
        }
        
        // 添加主题
        this.appStore.addTheme(normalizedPath);
        return { success: true };
    }
    
    /**
     * 更新主题
     * @param themeId - 主题ID
     * @param updates - 更新内容
     * @returns 更新结果
     */
    updateTheme(
        themeId: string, 
        updates: Partial<ThemeDefinition>
    ): { success: boolean; message?: string } {
        // 如果更新路径，需要验证
        if (updates.path) {
            const normalizedPath = normalizePath(updates.path);
            const validation = validatePathCharacters(normalizedPath);
            if (!validation.valid) {
                return { success: false, message: validation.message };
            }
            
            // 检查路径是否与其他主题冲突
            const themes = this.appStore.getState().settings.inputSettings.themes;
            const hasConflict = themes.some(t => 
                t.id !== themeId && t.path === normalizedPath
            );
            if (hasConflict) {
                return { success: false, message: '主题路径已被使用' };
            }
            
            updates.path = normalizedPath;
        }
        
        this.appStore.updateTheme(themeId, updates);
        return { success: true };
    }
    
    /**
     * 删除主题
     * @param themeId - 主题ID
     * @param includeChildren - 是否包含子主题
     * @returns 删除结果
     */
    deleteTheme(
        themeId: string, 
        includeChildren: boolean = false
    ): { success: boolean; deletedCount: number } {
        const themes = this.appStore.getState().settings.inputSettings.themes;
        const extendedThemes = this.getExtendedThemes(themes);
        const tree = buildThemeTree(extendedThemes, new Set());
        const node = findNodeInTree(tree, themeId);
        
        if (!node) {
            return { success: false, deletedCount: 0 };
        }
        
        const toDelete: string[] = [themeId];
        
        if (includeChildren) {
            const descendants = getDescendantIds(node);
            toDelete.push(...descendants.slice(1)); // 排除自身
        }
        
        toDelete.forEach(id => this.appStore.deleteTheme(id));
        
        return { success: true, deletedCount: toDelete.length };
    }
    
    /**
     * 执行批量操作
     * @param operation - 操作类型
     * @param themeIds - 主题ID列表
     * @returns 操作结果
     */
    async performBatchOperation(
        operation: BatchOperationType,
        themeIds: string[]
    ): Promise<BatchOperationResult> {
        const result: BatchOperationResult = {
            success: 0,
            failed: 0,
            errors: []
        };
        
        const themes = this.appStore.getState().settings.inputSettings.themes;
        const extendedThemes = this.getExtendedThemes(themes);
        
        for (const themeId of themeIds) {
            const theme = extendedThemes.find(t => t.id === themeId);
            if (!theme) {
                result.failed++;
                result.errors.push(`主题 ${themeId} 不存在`);
                continue;
            }
            
            try {
                switch (operation) {
                    case 'activate':
                        this.themeManager.activateTheme(theme.path);
                        result.success++;
                        break;
                        
                    case 'archive':
                        this.themeManager.deactivateTheme(theme.path);
                        result.success++;
                        break;
                        
                    case 'delete':
                        // 只允许删除非预定义主题
                        if (theme.source === 'predefined') {
                            result.failed++;
                            result.errors.push(`无法删除预定义主题 ${theme.path}`);
                        } else {
                            this.appStore.deleteTheme(themeId);
                            result.success++;
                        }
                        break;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`操作 ${theme.path} 失败: ${error}`);
            }
        }
        
        return result;
    }
    
    /**
     * 更新主题覆盖配置
     * @param themeId - 主题ID
     * @param blockId - Block ID
     * @param override - 覆盖配置
     */
    async updateThemeOverride(
        themeId: string,
        blockId: string,
        override: Partial<ThemeOverride> | null
    ): Promise<void> {
        if (override === null) {
            // 删除覆盖
            await this.appStore.deleteOverride(blockId, themeId);
        } else {
            // 使用 upsertOverride 来添加或更新
            await this.appStore.upsertOverride({
                themeId,
                blockId,
                disabled: override.disabled || false,
                outputTemplate: override.outputTemplate || '',
                targetFile: override.targetFile || '',
                appendUnderHeader: override.appendUnderHeader || ''
            });
        }
    }
    
    /**
     * 验证主题路径
     * @param path - 主题路径
     * @returns 验证结果
     */
    validatePath(path: string): { valid: boolean; message?: string } {
        return validatePathCharacters(normalizePath(path));
    }
    
    /**
     * 获取主题统计信息
     * @param themes - 主题列表
     * @returns 统计信息
     */
    getThemeStatistics(themes: ExtendedTheme[]): {
        total: number;
        active: number;
        archived: number;
        withOverrides: number;
        mostUsed: ExtendedTheme | null;
    } {
        const overrides = this.appStore.getState().settings.inputSettings.overrides;
        const overridesByTheme = new Map<string, number>();
        
        overrides.forEach(o => {
            const count = overridesByTheme.get(o.themeId) || 0;
            overridesByTheme.set(o.themeId, count + 1);
        });
        
        const active = themes.filter(t => t.status === 'active').length;
        const archived = themes.filter(t => t.status === 'inactive').length;
        const withOverrides = Array.from(overridesByTheme.keys()).length;
        
        const mostUsed = themes.reduce((max, theme) => {
            if (!max || (theme.usageCount || 0) > (max.usageCount || 0)) {
                return theme;
            }
            return max;
        }, null as ExtendedTheme | null);
        
        return {
            total: themes.length,
            active,
            archived,
            withOverrides,
            mostUsed
        };
    }
    
    /**
     * 导出主题配置
     * @param themeIds - 要导出的主题ID列表
     * @returns 导出的配置数据
     */
    exportThemeConfigurations(themeIds: string[]): {
        themes: ThemeDefinition[];
        overrides: ThemeOverride[];
    } {
        const allThemes = this.appStore.getState().settings.inputSettings.themes;
        const allOverrides = this.appStore.getState().settings.inputSettings.overrides;
        
        const themes = allThemes.filter(t => themeIds.includes(t.id));
        const overrides = allOverrides.filter(o => themeIds.includes(o.themeId));
        
        return { themes, overrides };
    }
    
    /**
     * 导入主题配置
     * @param data - 要导入的配置数据
     * @returns 导入结果
     */
    importThemeConfigurations(data: {
        themes: ThemeDefinition[];
        overrides: ThemeOverride[];
    }): { 
        imported: number; 
        skipped: number; 
        errors: string[] 
    } {
        const result = {
            imported: 0,
            skipped: 0,
            errors: [] as string[]
        };
        
        const existingThemes = this.appStore.getState().settings.inputSettings.themes;
        
        // 导入主题
        data.themes.forEach(theme => {
            const exists = existingThemes.some(t => t.path === theme.path);
            if (exists) {
                result.skipped++;
            } else {
                try {
                    this.appStore.addTheme(theme.path);
                    if (theme.icon) {
                        // 更新图标
                        const newTheme = this.appStore
                            .getState()
                            .settings
                            .inputSettings
                            .themes
                            .find(t => t.path === theme.path);
                        if (newTheme) {
                            this.appStore.updateTheme(newTheme.id, { icon: theme.icon });
                        }
                    }
                    result.imported++;
                } catch (error) {
                    result.errors.push(`导入主题 ${theme.path} 失败: ${error}`);
                }
            }
        });
        
        // 导入覆盖配置
        data.overrides.forEach(async override => {
            try {
                await this.appStore.upsertOverride(override);
            } catch (error) {
                result.errors.push(`导入覆盖配置失败: ${error}`);
            }
        });
        
        return result;
    }
    
    /**
     * 获取 ThemeManager 实例
     * @returns ThemeManager 实例
     */
    getThemeManager(): ThemeManager {
        return this.themeManager;
    }
    
    /**
     * 根据状态分组主题
     * @param tree - 主题树
     * @returns 分组后的主题
     */
    groupThemesByStatus(tree: ThemeTreeNode[]): {
        activeThemes: ThemeTreeNode[];
        archivedThemes: ThemeTreeNode[];
    } {
        const activeThemes: ThemeTreeNode[] = [];
        const archivedThemes: ThemeTreeNode[] = [];
        
        tree.forEach(node => {
            if (node.theme.status === 'active') {
                activeThemes.push(node);
            } else {
                archivedThemes.push(node);
            }
        });
        
        return { activeThemes, archivedThemes };
    }
}
