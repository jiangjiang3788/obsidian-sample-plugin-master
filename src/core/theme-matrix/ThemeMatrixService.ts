/**
 * ThemeMatrix 业务逻辑服务
 * 
 * 【S6 架构约束 - P0-5 写入口唯一化】
 * - 本服务只提供纯读/计算逻辑
 * - 所有写操作必须通过 useCases.theme.* 执行
 * - 禁止在 service 层直接调用 SettingsRepository.update
 */
import { type ThemeDefinition, ThemeOverride, BlockTemplate, ThinkSettings } from '@/core/types/schema';
import { type ExtendedTheme, BatchOperationType, ThemeTreeNode } from '@core/theme-matrix';
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
 * 
 * 【P0-5】已移除 writeOps，service 只提供纯读/计算能力
 */
export interface ThemeMatrixServiceConfig {
    /** 获取设置的函数 - 同步返回最新 settings */
    getSettings: () => ThinkSettings;
}

/**
 * 添加主题的验证结果
 */
export interface AddThemeValidation {
    valid: boolean;
    normalizedPath?: string;
    message?: string;
}

/**
 * 更新主题的验证结果
 */
export interface UpdateThemeValidation {
    valid: boolean;
    normalizedUpdates?: Partial<ThemeDefinition>;
    message?: string;
}

/**
 * 删除主题的计算结果
 */
export interface DeleteThemeComputation {
    themeIds: string[];
    count: number;
}

/**
 * ThemeMatrix 业务逻辑服务
 * 
 * 【P0-5 写入口唯一化】
 * - 本服务只提供纯读/计算逻辑
 * - 所有写操作通过返回"计算结果/patch建议"由 useCases.theme.* 执行
 * - 禁止直接调用 SettingsRepository.update
 */
export class ThemeMatrixService {
    private getSettings: () => ThinkSettings;
    
    constructor(config: ThemeMatrixServiceConfig) {
        this.getSettings = config.getSettings;
    }
    
    /**
     * 获取扩展的主题信息
     * @param themes - 基础主题列表
     * @returns 扩展主题列表
     */
    getExtendedThemes(themes: ThemeDefinition[]): ExtendedTheme[] {
        const settings = this.getSettings();
        const activeThemePaths = settings.activeThemePaths || [];

        return themes.map(theme => {
            // 状态真源：settings.activeThemePaths
            const isActive = activeThemePaths.includes(theme.path);
            
            // 如果主题已经有 source 属性，保留它；否则默认为 predefined
            // 注意：ThemeManager 移除后，source 属性可能需要从其他地方获取，或者暂时默认为 predefined
            const source = (theme as any).source || 'predefined';
            
            return {
                ...theme,
                status: isActive ? 'active' : 'inactive',
                source: source as 'predefined' | 'discovered',
                usageCount: 0, // 暂时移除 usageCount，后续如果需要可以从 DataStore 获取
                lastUsed: undefined // 暂时移除 lastUsed
            } as ExtendedTheme;
        });
    }
    
    /**
     * 【纯计算】验证添加主题的合法性
     * @param path - 主题路径
     * @returns 验证结果（包含规范化后的路径）
     */
    validateAddTheme(path: string): AddThemeValidation {
        // 规范化路径
        const normalizedPath = normalizePath(path);
        
        // 验证路径
        const validation = validatePathCharacters(normalizedPath);
        if (!validation.valid) {
            return { valid: false, message: validation.message };
        }
        
        // 检查是否已存在
        const themes = this.getSettings().inputSettings.themes;
        if (themes.some((t: ThemeDefinition) => t.path === normalizedPath)) {
            return { valid: false, message: '主题路径已存在' };
        }
        
        return { valid: true, normalizedPath };
    }
    
    /**
     * 【纯计算】验证更新主题的合法性
     * @param themeId - 主题ID
     * @param updates - 更新内容
     * @returns 验证结果（包含规范化后的更新）
     */
    validateUpdateTheme(
        themeId: string, 
        updates: Partial<ThemeDefinition>
    ): UpdateThemeValidation {
        const normalizedUpdates = { ...updates };
        
        // 如果更新路径，需要验证
        if (updates.path) {
            const normalizedPath = normalizePath(updates.path);
            const validation = validatePathCharacters(normalizedPath);
            if (!validation.valid) {
                return { valid: false, message: validation.message };
            }
            
            // 检查路径是否与其他主题冲突
            const themes = this.getSettings().inputSettings.themes;
            const hasConflict = themes.some((t: ThemeDefinition) => 
                t.id !== themeId && t.path === normalizedPath
            );
            if (hasConflict) {
                return { valid: false, message: '主题路径已被使用' };
            }
            
            normalizedUpdates.path = normalizedPath;
        }
        
        return { valid: true, normalizedUpdates };
    }
    
    /**
     * 【纯计算】计算要删除的主题ID列表（含子节点）
     * @param themeId - 主题ID
     * @param includeChildren - 是否包含子主题
     * @returns 要删除的主题ID列表
     */
    computeDeleteThemeIds(
        themeId: string, 
        includeChildren: boolean = false
    ): DeleteThemeComputation {
        const themes = this.getSettings().inputSettings.themes;
        const extendedThemes = this.getExtendedThemes(themes);
        const tree = buildThemeTree(extendedThemes, new Set());
        const node = findNodeInTree(tree, themeId);
        
        if (!node) {
            return { themeIds: [], count: 0 };
        }
        
        const toDelete: string[] = [themeId];
        
        if (includeChildren) {
            const descendants = getDescendantIds(node);
            toDelete.push(...descendants.slice(1)); // 排除自身
        }
        
        return { themeIds: toDelete, count: toDelete.length };
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
        const overrides = this.getSettings().inputSettings.overrides;
        const overridesByTheme = new Map<string, number>();
        
        overrides.forEach((o: ThemeOverride) => {
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
        const allThemes = this.getSettings().inputSettings.themes;
        const allOverrides = this.getSettings().inputSettings.overrides;
        
        const themes = allThemes.filter((t: ThemeDefinition) => themeIds.includes(t.id));
        const overrides = allOverrides.filter((o: ThemeOverride) => themeIds.includes(o.themeId));
        
        return { themes, overrides };
    }
    
    /**
     * 【纯计算】预览导入主题配置
     * 计算哪些主题和覆盖配置可以导入，哪些会被跳过
     * @param data - 要导入的配置数据
     * @returns 导入预览结果，包含可导入项（由 useCases.theme 执行实际写入）
     */
    previewImportConfigurations(data: {
        themes: ThemeDefinition[];
        overrides: ThemeOverride[];
    }): { 
        themesToAdd: Array<{ path: string; icon?: string }>;
        overridesToAdd: ThemeOverride[];
        skippedThemes: string[];
    } {
        const existingThemes = this.getSettings().inputSettings.themes;
        const existingPaths = new Set(existingThemes.map((t: ThemeDefinition) => t.path));
        
        const themesToAdd: Array<{ path: string; icon?: string }> = [];
        const skippedThemes: string[] = [];
        
        // 计算可导入的主题
        for (const theme of data.themes) {
            if (existingPaths.has(theme.path)) {
                skippedThemes.push(theme.path);
            } else {
                themesToAdd.push({ path: theme.path, icon: theme.icon });
            }
        }
        
        // 覆盖配置全部返回，由 useCases 执行 upsert
        return {
            themesToAdd,
            overridesToAdd: data.overrides,
            skippedThemes
        };
    }
    
    /**
     * 根据状态分组主题
     * @param tree - 主题树
     * @returns 分组后的主题
     */
    groupThemesByStatus(tree: ThemeTreeNode[]) {
    const activeThemes: ThemeTreeNode[] = [];
    const archivedThemes: ThemeTreeNode[] = [];

    tree.forEach(node => {
        // ✅ 现在只有 active/inactive，没有 archived 概念
        // 先让 inactive 也默认可见
        activeThemes.push(node);

        // 如果你未来真要 archived，再引入第三种状态再分
        // if (node.theme.status === 'archived') archivedThemes.push(node);
    });

    return { activeThemes, archivedThemes };
    }
}
