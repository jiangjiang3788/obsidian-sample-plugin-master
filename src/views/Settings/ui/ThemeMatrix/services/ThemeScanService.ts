/**
 * 主题扫描服务
 * 负责从数据中扫描主题并提供智能导入功能
 */
import type { AppStore } from '@store/AppStore';
import type { ThemeDefinition, Item } from '@lib/types/domain/schema';
import { ThemeManager } from '@lib/services/core/ThemeManager';
import { DataStore } from '@lib/services/core/dataStore';
import { 
    deduplicateThemes, 
    type DeduplicationResult 
} from '../utils/themeDeduplication';

/**
 * 扫描配置
 */
export interface ScanConfig {
    /** 是否包含任务主题 */
    includeTasks: boolean;
    /** 是否包含Block主题 */
    includeBlocks: boolean;
    /** 最小使用次数过滤 */
    minUsageCount: number;
}

/**
 * 扫描结果
 */
export interface ScanResult {
    /** 扫描到的原始主题 */
    rawThemes: string[];
    /** 去重结果 */
    deduplicationResult: DeduplicationResult;
    /** 扫描统计 */
    stats: ScanStats;
}

/**
 * 扫描统计
 */
export interface ScanStats {
    /** 总扫描的Item数量 */
    totalItems: number;
    /** 包含主题的Item数量 */
    itemsWithThemes: number;
    /** 发现的唯一主题数量 */
    uniqueThemes: number;
    /** 新主题数量 */
    newThemes: number;
    /** 按类型统计 */
    byType: {
        tasks: number;
        blocks: number;
    };
}

/**
 * 导入结果
 */
export interface ImportResult {
    /** 成功导入的数量 */
    imported: number;
    /** 跳过的数量 */
    skipped: number;
    /** 失败的数量 */
    failed: number;
    /** 错误信息 */
    errors: string[];
}

/**
 * 主题扫描服务配置
 */
export interface ThemeScanServiceConfig {
    appStore: AppStore;
    dataStore: DataStore;
    themeManager?: ThemeManager;
}

/**
 * 主题扫描服务
 */
export class ThemeScanService {
    private appStore: AppStore;
    private dataStore: DataStore;
    private themeManager: ThemeManager;
    
    constructor(config: ThemeScanServiceConfig) {
        this.appStore = config.appStore;
        this.dataStore = config.dataStore;
        this.themeManager = config.themeManager || new ThemeManager();
    }
    
    /**
     * 从数据中提取主题
     * @param items - Item数据列表
     * @param config - 扫描配置
     * @returns 主题使用统计Map
     */
    private extractThemesFromItems(
        items: Item[], 
        config: ScanConfig
    ): Map<string, { count: number; sources: string[] }> {
        const themeStats = new Map<string, { count: number; sources: string[] }>();
        
        for (const item of items) {
            // 跳过不符合配置的项目
            if (!config.includeTasks && item.type === 'task') continue;
            if (!config.includeBlocks && item.type === 'block') continue;
            
            const theme = this.themeManager.extractTheme(item);
            if (theme && theme.trim() !== '') {
                const normalizedTheme = theme.trim();
                const existing = themeStats.get(normalizedTheme) || { count: 0, sources: [] };
                existing.count++;
                existing.sources.push(`${item.type}:${item.id}`);
                themeStats.set(normalizedTheme, existing);
            }
        }
        
        // 过滤掉使用次数低于阈值的主题
        if (config.minUsageCount > 1) {
            for (const [theme, stats] of themeStats.entries()) {
                if (stats.count < config.minUsageCount) {
                    themeStats.delete(theme);
                }
            }
        }
        
        return themeStats;
    }
    
    /**
     * 扫描数据中的主题
     * @param config - 扫描配置
     * @returns 扫描结果
     */
    async scanThemesFromData(config: ScanConfig = {
        includeTasks: true,
        includeBlocks: true,
        minUsageCount: 1
    }): Promise<ScanResult> {
        // 获取所有数据
        const items = this.dataStore.queryItems();
        
        // 提取主题统计
        const themeStats = this.extractThemesFromItems(items, config);
        const rawThemes = Array.from(themeStats.keys());
        
        // 获取现有主题
        const existingThemes = this.appStore.getState().settings.inputSettings.themes;
        const existingThemePaths = existingThemes.map(t => t.path);
        
        // 执行去重检测
        const deduplicationResult = deduplicateThemes(rawThemes, existingThemePaths);
        
        // 计算统计信息
        const stats: ScanStats = {
            totalItems: items.length,
            itemsWithThemes: items.filter(item => {
                if (!config.includeTasks && item.type === 'task') return false;
                if (!config.includeBlocks && item.type === 'block') return false;
                return this.themeManager.extractTheme(item) !== null;
            }).length,
            uniqueThemes: rawThemes.length,
            newThemes: deduplicationResult.newThemes.length,
            byType: {
                tasks: items.filter(item => 
                    item.type === 'task' && 
                    config.includeTasks && 
                    this.themeManager.extractTheme(item) !== null
                ).length,
                blocks: items.filter(item => 
                    item.type === 'block' && 
                    config.includeBlocks && 
                    this.themeManager.extractTheme(item) !== null
                ).length
            }
        };
        
        return {
            rawThemes,
            deduplicationResult,
            stats
        };
    }
    
    /**
     * 导入新主题到系统
     * @param themes - 要导入的主题路径列表
     * @returns 导入结果
     */
    async importThemes(themes: string[]): Promise<ImportResult> {
        const result: ImportResult = {
            imported: 0,
            skipped: 0,
            failed: 0,
            errors: []
        };
        
        const existingThemes = this.appStore.getState().settings.inputSettings.themes;
        const existingPaths = new Set(existingThemes.map(t => t.path));
        
        for (const theme of themes) {
            try {
                // 检查是否已存在
                if (existingPaths.has(theme)) {
                    result.skipped++;
                    continue;
                }
                
                // 添加主题
                await this.appStore.addTheme(theme);
                result.imported++;
                
                // 在ThemeManager中发现这个主题
                this.themeManager.discoverTheme(theme);
                
            } catch (error) {
                result.failed++;
                result.errors.push(`导入主题 "${theme}" 失败: ${error}`);
            }
        }
        
        return result;
    }
    
    /**
     * 获取主题使用详情
     * @param themePath - 主题路径
     * @returns 使用详情
     */
    async getThemeUsageDetails(themePath: string): Promise<{
        items: Item[];
        totalCount: number;
        byType: { tasks: number; blocks: number; };
        recentUsage: Item[];
    }> {
        const items = this.dataStore.queryItems();
        const themeItems = items.filter(item => {
            const theme = this.themeManager.extractTheme(item);
            return theme === themePath;
        });
        
        const byType = {
            tasks: themeItems.filter(item => item.type === 'task').length,
            blocks: themeItems.filter(item => item.type === 'block').length
        };
        
        // 获取最近使用的项目（按修改时间排序）
        const recentUsage = themeItems
            .sort((a, b) => (b.modified || 0) - (a.modified || 0))
            .slice(0, 10);
        
        return {
            items: themeItems,
            totalCount: themeItems.length,
            byType,
            recentUsage
        };
    }
    
    /**
     * 预览导入操作
     * @param themes - 待导入的主题列表
     * @returns 预览结果
     */
    async previewImport(themes: string[]): Promise<{
        willImport: string[];
        willSkip: Array<{ theme: string; reason: string; }>;
        estimatedTime: number;
    }> {
        const existingThemes = this.appStore.getState().settings.inputSettings.themes;
        const existingPaths = new Set(existingThemes.map(t => t.path));
        
        const willImport: string[] = [];
        const willSkip: Array<{ theme: string; reason: string; }> = [];
        
        for (const theme of themes) {
            if (existingPaths.has(theme)) {
                willSkip.push({
                    theme,
                    reason: '主题已存在'
                });
            } else if (!theme || theme.trim() === '') {
                willSkip.push({
                    theme,
                    reason: '主题路径为空'
                });
            } else {
                willImport.push(theme);
            }
        }
        
        // 估计导入时间（每个主题大约需要10ms）
        const estimatedTime = willImport.length * 10;
        
        return {
            willImport,
            willSkip,
            estimatedTime
        };
    }
    
    /**
     * 批量激活主题
     * @param themePaths - 主题路径列表
     */
    async batchActivateThemes(themePaths: string[]): Promise<void> {
        for (const path of themePaths) {
            this.themeManager.activateTheme(path);
        }
    }
    
    /**
     * 获取默认扫描配置
     * @returns 默认配置
     */
    getDefaultScanConfig(): ScanConfig {
        return {
            includeTasks: true,
            includeBlocks: true,
            minUsageCount: 1
        };
    }
    
    /**
     * 验证扫描配置
     * @param config - 配置对象
     * @returns 验证结果
     */
    validateScanConfig(config: Partial<ScanConfig>): {
        isValid: boolean;
        errors: string[];
        corrected: ScanConfig;
    } {
        const errors: string[] = [];
        const corrected: ScanConfig = {
            includeTasks: config.includeTasks ?? true,
            includeBlocks: config.includeBlocks ?? true,
            minUsageCount: config.minUsageCount ?? 1
        };
        
        // 验证必须至少包含一种类型
        if (!corrected.includeTasks && !corrected.includeBlocks) {
            errors.push('必须至少包含任务或Block中的一种类型');
            corrected.includeTasks = true;
        }
        
        // 验证最小使用次数
        if (corrected.minUsageCount < 1) {
            errors.push('最小使用次数必须大于等于1');
            corrected.minUsageCount = 1;
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            corrected
        };
    }
}
