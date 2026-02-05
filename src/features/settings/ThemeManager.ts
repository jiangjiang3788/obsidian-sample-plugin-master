// src/core/services/ThemeManager.ts
import type { Theme } from '@core/public';
import { Item } from '@core/public';
import type { IThemeMatcher } from '@core/public';

/**
 * 主题管理服务
 * 负责主题的创建、发现、激活和管理
 * 实现 IThemeMatcher 接口供 core 层使用
 */
export class ThemeManager implements IThemeMatcher {
    private themes: Map<string, Theme> = new Map();
    private themeIdCounter: number = 0;

    constructor() {
        // 不自动初始化默认主题，让测试和用户自行添加
    }

    /**
     * 初始化默认的预定义主题
     */
    private initializeDefaultThemes(): void {
        // 默认不添加主题，让测试和用户自行添加
        // 如果需要默认主题，可以在插件初始化时调用 addDefaultThemes()
    }

    /**
     * 添加常用的默认主题
     */
    addDefaultThemes(): void {
        this.addPredefinedTheme('工作', '💼');
        this.addPredefinedTheme('生活', '🏠');
        this.addPredefinedTheme('学习', '📚');
        this.addPredefinedTheme('健康', '💪');
        this.addPredefinedTheme('项目', '📁');
    }

    /**
     * 生成唯一的主题ID
     */
    private generateThemeId(): string {
        return `theme_${++this.themeIdCounter}`;
    }

    /**
     * 根据路径查找父主题
     */
    private findParentTheme(path: string): string | null {
        const parts = path.split('/');
        if (parts.length <= 1) return null;
        
        const parentPath = parts.slice(0, -1).join('/');
        const parentTheme = Array.from(this.themes.values())
            .find(theme => theme.path === parentPath);
        
        return parentTheme?.id || null;
    }

    /**
     * 添加预定义主题
     */
    addPredefinedTheme(path: string, icon?: string): Theme {
        // 检查主题是否已存在
        const existing = Array.from(this.themes.values())
            .find(theme => theme.path === path) as any;
        
        if (existing) {
            // 更新现有主题
            existing.icon = icon || existing.icon;
            existing.source = 'predefined';
            existing.status = 'active';
            existing.originallyPredefined = true; // 标记为原始预定义
            return existing;
        }

        // 创建新主题，添加额外属性标记原始预定义
        const theme: any = {
            id: this.generateThemeId(),
            path: path,
            name: path.split('/').pop() || path,
            icon: icon,
            parentId: this.findParentTheme(path),
            status: 'active',
            source: 'predefined',
            usageCount: 0,
            order: this.themes.size,
            originallyPredefined: true // 标记为原始预定义
        };

        this.themes.set(theme.id, theme);
        return theme;
    }

    /**
     * 发现新主题（从数据中提取）
     */
    discoverTheme(path: string): Theme {
        if (!path || path.trim() === '') {
            throw new Error('主题路径不能为空');
        }

        // 检查主题是否已存在
        const existing = Array.from(this.themes.values())
            .find(theme => theme.path === path);
        
        if (existing) {
            // 增加使用次数
            existing.usageCount++;
            existing.lastUsed = Date.now();
            return existing;
        }

        // 创建新的发现主题
        const theme: Theme = {
            id: this.generateThemeId(),
            path: path,
            name: path.split('/').pop() || path,
            parentId: this.findParentTheme(path),
            status: 'inactive',
            source: 'discovered',
            usageCount: 1,
            lastUsed: Date.now(),
            order: this.themes.size
        };

        this.themes.set(theme.id, theme);
        return theme;
    }

    /**
     * 激活主题（使其在快速输入中可用）
     */
    activateTheme(path: string): void {
        const theme = Array.from(this.themes.values())
            .find(t => t.path === path);
        
        if (theme) {
            theme.status = 'active';
            // 如果是发现的主题，可能要改变其来源
            if (theme.source === 'discovered') {
                theme.source = 'predefined';
            }
        }
    }

    /**
     * 停用主题
     */
    deactivateTheme(path: string): void {
        const theme = Array.from(this.themes.values())
            .find(t => t.path === path) as any;
        
        // 只有原始预定义的主题不能停用
        if (theme && !theme.originallyPredefined) {
            theme.status = 'inactive';
        }
    }

    /**
     * 获取所有激活的主题
     */
    getActiveThemes(): Theme[] {
        return Array.from(this.themes.values())
            .filter(theme => theme.status === 'active')
            .sort((a, b) => {
                // 先按使用次数降序
                if (a.usageCount !== b.usageCount) {
                    return b.usageCount - a.usageCount;
                }
                // 再按最后使用时间降序
                if (a.lastUsed && b.lastUsed) {
                    return b.lastUsed - a.lastUsed;
                }
                // 最后按order升序
                return a.order - b.order;
            });
    }

    /**
     * 获取所有主题（分类）
     */
    getAllThemes(): { active: Theme[], inactive: Theme[], discovered: Theme[] } {
        const themes = Array.from(this.themes.values());
        
        return {
            active: themes.filter(t => t.status === 'active'),
            inactive: themes.filter(t => t.status === 'inactive'),
            discovered: themes.filter(t => t.source === 'discovered')
        };
    }

    /**
     * 从Item中提取主题
     */
    extractTheme(item: Item): string | null {
        // 根据数据类型使用不同字段提取主题
        if (item.type === 'task') {
            // 任务类型从theme字段提取主题（已经经过智能匹配）
            return item.theme || null;
        } else if (item.type === 'block') {
            // Block类型从theme字段提取主题
            return item.theme || null;
        }
        
        // 其他类型优先使用theme字段
        return item.theme || null;
    }

    /**
     * 根据部分文本匹配完整主题路径
     * 例如：headerText = "娱乐"，匹配到 "生活/娱乐"
     * 实现 IThemeMatcher 接口
     */
    findThemeByPartialMatch(headerText: string): string | null {
        if (!headerText || headerText.trim() === '') {
            return null;
        }

        const normalizedHeader = headerText.trim().toLowerCase();
        const allThemes = Array.from(this.themes.values());
        
        // 优先级匹配策略（修复：更严格的匹配顺序，避免误匹配）
        // 1. 精确匹配完整路径
        for (const theme of allThemes) {
            if (theme.path.toLowerCase() === normalizedHeader) {
                return theme.path;
            }
        }
        
        // 2. 精确匹配主题名称（路径最后一部分）
        for (const theme of allThemes) {
            const themeName = theme.path.split('/').pop()?.toLowerCase();
            if (themeName === normalizedHeader) {
                return theme.path;
            }
        }
        
        // 3. 路径以 header 结尾（例如：header="娱乐" 匹配 "生活/娱乐"）
        for (const theme of allThemes) {
            if (theme.path.toLowerCase().endsWith('/' + normalizedHeader)) {
                return theme.path;
            }
        }
        
        // 4. 完整路径包含 header（但要求是完整的单词，不是部分字符）
        // 例如："运动" 可以匹配 "健康/运动"，但 "剪" 不应该匹配 "剪指甲"
        for (const theme of allThemes) {
            const pathLower = theme.path.toLowerCase();
            // 检查是否作为独立部分存在（前后是 / 或字符串边界）
            const regex = new RegExp(`(^|/)${normalizedHeader}(/|$)`, 'i');
            if (regex.test(pathLower)) {
                return theme.path;
            }
        }
        
        // 5. 主题名称包含 header（宽松匹配，但排在最后）
        // 只有当没有更精确的匹配时才使用
        for (const theme of allThemes) {
            const themeName = theme.path.split('/').pop()?.toLowerCase();
            if (themeName && themeName.includes(normalizedHeader)) {
                return theme.path;
            }
        }
        
        // 未找到匹配项
        return null;
    }

    /**
     * 扫描数据项，发现新主题
     */
    scanDataForThemes(items: Item[]): void {
        const themeSet = new Set<string>();
        
        for (const item of items) {
            const theme = this.extractTheme(item);
            if (theme) {
                themeSet.add(theme);
            }
        }
        
        // 发现每个唯一的主题
        for (const themePath of themeSet) {
            this.discoverTheme(themePath);
        }
    }

    /**
     * 获取主题统计信息
     */
    getThemeStats(): {
        total: number;
        active: number;
        inactive: number;
        predefined: number;
        discovered: number;
    } {
        const themes = Array.from(this.themes.values());
        
        return {
            total: themes.length,
            active: themes.filter(t => t.status === 'active').length,
            inactive: themes.filter(t => t.status === 'inactive').length,
            predefined: themes.filter(t => t.source === 'predefined').length,
            discovered: themes.filter(t => t.source === 'discovered').length
        };
    }

    /**
     * 删除主题
     */
    removeTheme(path: string): boolean {
        const theme = Array.from(this.themes.values())
            .find(t => t.path === path) as any;
        
        // 只有原始预定义的主题不能删除
        if (theme && !theme.originallyPredefined) {
            return this.themes.delete(theme.id);
        }
        
        return false;
    }

    /**
     * 更新主题图标
     */
    updateThemeIcon(path: string, icon: string): void {
        const theme = Array.from(this.themes.values())
            .find(t => t.path === path);
        
        if (theme) {
            theme.icon = icon;
        }
    }

    /**
     * 获取主题层级结构
     */
    getThemeHierarchy(): Map<string | null, Theme[]> {
        const hierarchy = new Map<string | null, Theme[]>();
        
        for (const theme of this.themes.values()) {
            const parentId = theme.parentId;
            if (!hierarchy.has(parentId)) {
                hierarchy.set(parentId, []);
            }
            hierarchy.get(parentId)!.push(theme);
        }
        
        return hierarchy;
    }

    /**
     * 清除所有主题
     */
    clearThemes(): void {
        this.themes.clear();
        this.themeIdCounter = 0;
        // 不自动初始化默认主题
    }

    /**
     * 导出主题配置
     */
    exportThemes(): Theme[] {
        return Array.from(this.themes.values());
    }

    /**
     * 导入主题配置
     */
    importThemes(themes: Theme[]): void {
        for (const theme of themes) {
            // 确保ID唯一
            if (!this.themes.has(theme.id)) {
                this.themes.set(theme.id, theme);
                // 更新ID计数器
                const idNum = parseInt(theme.id.replace('theme_', ''));
                if (!isNaN(idNum) && idNum > this.themeIdCounter) {
                    this.themeIdCounter = idNum;
                }
            }
        }
    }

    /**
     * 根据路径获取主题
     */
    getThemeByPath(path: string): Theme | undefined {
        return Array.from(this.themes.values())
            .find(t => t.path === path);
    }

    /**
     * 更新主题使用统计
     */
    updateThemeUsage(path: string): void {
        const theme = this.getThemeByPath(path);
        if (theme) {
            theme.usageCount++;
            theme.lastUsed = Date.now();
        }
    }
}
