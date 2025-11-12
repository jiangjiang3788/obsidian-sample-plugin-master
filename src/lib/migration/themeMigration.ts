// src/core/migration/themeMigration.ts

import { Item } from '@core/types/domain/schematypes/domain/schema';
import { ThemeManager } from '../services/core/ThemeManager';

/**
 * 主题迁移工具
 * 负责将现有数据迁移到新的主题系统
 */
export class ThemeMigration {
    private themeManager: ThemeManager;

    constructor(themeManager: ThemeManager) {
        this.themeManager = themeManager;
    }

    /**
     * 迁移单个数据项
     * 为没有主题的项目设置主题
     */
    migrateItem(item: Item): Item {
        // 如果已经有主题，跳过
        if (item.theme) {
            return item;
        }

        // 对于任务类型：主题是header
        if (item.type === 'task' && item.header) {
            item.theme = item.header;
            // 发现这个主题
            this.themeManager.discoverTheme(item.header);
        }
        // 对于块类型：尝试从tags迁移
        else if (item.type === 'block' && item.tags && item.tags.length > 0) {
            // 使用第一个标签作为主题
            item.theme = item.tags[0];
            // 发现这个主题
            this.themeManager.discoverTheme(item.tags[0]);
        }

        return item;
    }

    /**
     * 批量迁移数据项
     */
    async migrateItems(items: Item[]): Promise<{
        migrated: Item[];
        stats: {
            total: number;
            migrated: number;
            skipped: number;
            themesDiscovered: Set<string>;
        };
    }> {
        const migrated: Item[] = [];
        const stats = {
            total: items.length,
            migrated: 0,
            skipped: 0,
            themesDiscovered: new Set<string>()
        };

        for (const item of items) {
            const originalTheme = item.theme;
            const migratedItem = this.migrateItem(item);
            
            if (!originalTheme && migratedItem.theme) {
                stats.migrated++;
                stats.themesDiscovered.add(migratedItem.theme);
            } else {
                stats.skipped++;
            }
            
            migrated.push(migratedItem);
        }

        return { migrated, stats };
    }

    /**
     * 从旧的标签系统迁移到主题系统
     * 分析现有的标签使用情况，建议预定义主题
     */
    analyzeTagsForThemes(items: Item[]): Map<string, number> {
        const tagUsage = new Map<string, number>();

        for (const item of items) {
            // 统计任务的header
            if (item.type === 'task' && item.header) {
                const count = tagUsage.get(item.header) || 0;
                tagUsage.set(item.header, count + 1);
            }
            
            // 统计块的标签
            if (item.type === 'block' && item.tags) {
                for (const tag of item.tags) {
                    const count = tagUsage.get(tag) || 0;
                    tagUsage.set(tag, count + 1);
                }
            }
        }

        // 按使用次数排序
        return new Map([...tagUsage.entries()].sort((a, b) => b[1] - a[1]));
    }

    /**
     * 自动创建常用主题
     * 基于使用频率自动将高频标签转换为预定义主题
     */
    async autoCreateFrequentThemes(
        items: Item[],
        threshold: number = 5
    ): Promise<string[]> {
        const tagUsage = this.analyzeTagsForThemes(items);
        const createdThemes: string[] = [];

        for (const [tag, count] of tagUsage) {
            if (count >= threshold) {
                // 添加为预定义主题
                this.themeManager.addPredefinedTheme(tag);
                createdThemes.push(tag);
            } else {
                // 只是发现主题，不激活
                this.themeManager.discoverTheme(tag);
            }
        }

        return createdThemes;
    }

    /**
     * 清理迁移后的冗余数据
     * 可选：移除已迁移到主题的标签
     */
    cleanupAfterMigration(items: Item[], removeTagsFromBlocks: boolean = false): Item[] {
        return items.map(item => {
            // 如果块已经有主题，可以选择性地清理标签
            if (removeTagsFromBlocks && item.type === 'block' && item.theme && item.tags) {
                // 移除与主题相同的标签
                item.tags = item.tags.filter(tag => tag !== item.theme);
            }
            return item;
        });
    }

    /**
     * 生成迁移报告
     */
    generateMigrationReport(stats: {
        total: number;
        migrated: number;
        skipped: number;
        themesDiscovered: Set<string>;
    }): string {
        const report = `
# 主题迁移报告

## 概况
- 总数据项: ${stats.total}
- 已迁移: ${stats.migrated}
- 已跳过: ${stats.skipped}
- 迁移率: ${((stats.migrated / stats.total) * 100).toFixed(2)}%

## 发现的主题
${Array.from(stats.themesDiscovered).map(theme => `- ${theme}`).join('\n')}

## 建议
${stats.themesDiscovered.size > 10 ? '- 发现的主题较多，建议审查并激活常用主题' : ''}
${stats.migrated > 0 ? '- 迁移成功，建议检查数据正确性' : ''}
${stats.skipped > stats.migrated ? '- 大部分数据已有主题，系统状态良好' : ''}
        `;
        
        return report.trim();
    }
}
