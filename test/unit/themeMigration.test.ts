// test/unit/themeMigration.test.ts

import { ThemeMigration } from '@core/migration/themeMigration';
import { ThemeManager } from '@core/services/ThemeManager';
import { Item } from '@core/domain/schema';

describe('ThemeMigration', () => {
    let themeManager: ThemeManager;
    let migration: ThemeMigration;

    beforeEach(() => {
        themeManager = new ThemeManager();
        migration = new ThemeMigration(themeManager);
    });

    describe('单个数据项迁移', () => {
        test('应该为任务设置主题（从header）', () => {
            const item: Item = {
                id: 'task1',
                type: 'task',
                title: '完成报告',
                header: '工作计划',
                content: '',
                tags: [],
                recurrence: 'none',
                created: 0,
                modified: 0,
                extra: {},
                categoryKey: '任务/open',
                folder: 'test'
            };

            const migrated = migration.migrateItem(item);
            
            expect(migrated.theme).toBe('工作计划');
        });

        test('应该为块设置主题（从tags）', () => {
            const item: Item = {
                id: 'block1',
                type: 'block',
                title: '会议记录',
                content: '',
                tags: ['会议', '重要'],
                recurrence: 'none',
                created: 0,
                modified: 0,
                extra: {},
                categoryKey: '块',
                folder: 'test'
            };

            const migrated = migration.migrateItem(item);
            
            expect(migrated.theme).toBe('会议');
        });

        test('应该跳过已有主题的项目', () => {
            const item: Item = {
                id: 'task2',
                type: 'task',
                title: '任务',
                theme: '已有主题',
                header: '新主题',
                content: '',
                tags: [],
                recurrence: 'none',
                created: 0,
                modified: 0,
                extra: {},
                categoryKey: '任务/open',
                folder: 'test'
            };

            const migrated = migration.migrateItem(item);
            
            expect(migrated.theme).toBe('已有主题');
        });

        test('没有header的任务不设置主题', () => {
            const item: Item = {
                id: 'task3',
                type: 'task',
                title: '独立任务',
                content: '',
                tags: [],
                recurrence: 'none',
                created: 0,
                modified: 0,
                extra: {},
                categoryKey: '任务/open',
                folder: 'test'
            };

            const migrated = migration.migrateItem(item);
            
            expect(migrated.theme).toBeUndefined();
        });
    });

    describe('批量迁移', () => {
        test('应该正确迁移多个数据项', async () => {
            const items: Item[] = [
                {
                    id: '1',
                    type: 'task',
                    title: '任务1',
                    header: '项目A',
                    content: '',
                    tags: [],
                    recurrence: 'none',
                    created: 0,
                    modified: 0,
                    extra: {},
                    categoryKey: '任务/open',
                    folder: 'test'
                },
                {
                    id: '2',
                    type: 'block',
                    title: '笔记1',
                    content: '',
                    tags: ['学习'],
                    recurrence: 'none',
                    created: 0,
                    modified: 0,
                    extra: {},
                    categoryKey: '块',
                    folder: 'test'
                },
                {
                    id: '3',
                    type: 'task',
                    title: '任务2',
                    theme: '已有主题',
                    content: '',
                    tags: [],
                    recurrence: 'none',
                    created: 0,
                    modified: 0,
                    extra: {},
                    categoryKey: '任务/open',
                    folder: 'test'
                }
            ];

            const { migrated, stats } = await migration.migrateItems(items);
            
            expect(migrated.length).toBe(3);
            expect(stats.total).toBe(3);
            expect(stats.migrated).toBe(2);
            expect(stats.skipped).toBe(1);
            expect(stats.themesDiscovered.size).toBe(2);
            expect(stats.themesDiscovered.has('项目A')).toBe(true);
            expect(stats.themesDiscovered.has('学习')).toBe(true);
        });

        test('应该正确处理重复主题', async () => {
            const items: Item[] = [
                {
                    id: '1',
                    type: 'task',
                    title: '任务1',
                    header: '重复主题',
                    content: '',
                    tags: [],
                    recurrence: 'none',
                    created: 0,
                    modified: 0,
                    extra: {},
                    categoryKey: '任务/open',
                    folder: 'test'
                },
                {
                    id: '2',
                    type: 'task',
                    title: '任务2',
                    header: '重复主题',
                    content: '',
                    tags: [],
                    recurrence: 'none',
                    created: 0,
                    modified: 0,
                    extra: {},
                    categoryKey: '任务/open',
                    folder: 'test'
                }
            ];

            const { stats } = await migration.migrateItems(items);
            
            expect(stats.themesDiscovered.size).toBe(1);
            expect(stats.migrated).toBe(2);
        });
    });

    describe('标签分析', () => {
        test('应该正确统计标签使用情况', () => {
            const items: Item[] = [
                {
                    id: '1',
                    type: 'task',
                    title: '任务1',
                    header: '工作',
                    content: '',
                    tags: [],
                    recurrence: 'none',
                    created: 0,
                    modified: 0,
                    extra: {},
                    categoryKey: '任务/open',
                    folder: 'test'
                },
                {
                    id: '2',
                    type: 'task',
                    title: '任务2',
                    header: '工作',
                    content: '',
                    tags: [],
                    recurrence: 'none',
                    created: 0,
                    modified: 0,
                    extra: {},
                    categoryKey: '任务/open',
                    folder: 'test'
                },
                {
                    id: '3',
                    type: 'block',
                    title: '块1',
                    content: '',
                    tags: ['学习', '工作'],
                    recurrence: 'none',
                    created: 0,
                    modified: 0,
                    extra: {},
                    categoryKey: '块',
                    folder: 'test'
                }
            ];

            const tagUsage = migration.analyzeTagsForThemes(items);
            
            expect(tagUsage.get('工作')).toBe(3);
            expect(tagUsage.get('学习')).toBe(1);
        });

        test('应该按使用次数排序', () => {
            const items: Item[] = [
                {
                    id: '1',
                    type: 'task',
                    title: '任务1',
                    header: '主题A',
                    content: '',
                    tags: [],
                    recurrence: 'none',
                    created: 0,
                    modified: 0,
                    extra: {},
                    categoryKey: '任务/open',
                    folder: 'test'
                },
                {
                    id: '2',
                    type: 'task',
                    title: '任务2',
                    header: '主题B',
                    content: '',
                    tags: [],
                    recurrence: 'none',
                    created: 0,
                    modified: 0,
                    extra: {},
                    categoryKey: '任务/open',
                    folder: 'test'
                },
                {
                    id: '3',
                    type: 'task',
                    title: '任务3',
                    header: '主题B',
                    content: '',
                    tags: [],
                    recurrence: 'none',
                    created: 0,
                    modified: 0,
                    extra: {},
                    categoryKey: '任务/open',
                    folder: 'test'
                }
            ];

            const tagUsage = migration.analyzeTagsForThemes(items);
            const sorted = Array.from(tagUsage.entries());
            
            expect(sorted[0][0]).toBe('主题B');
            expect(sorted[0][1]).toBe(2);
            expect(sorted[1][0]).toBe('主题A');
            expect(sorted[1][1]).toBe(1);
        });
    });

    describe('自动创建常用主题', () => {
        test('应该为高频主题创建预定义主题', async () => {
            const items: Item[] = [];
            // 创建6个使用"高频主题"的任务
            for (let i = 0; i < 6; i++) {
                items.push({
                    id: `task${i}`,
                    type: 'task',
                    title: `任务${i}`,
                    header: '高频主题',
                    content: '',
                    tags: [],
                    recurrence: 'none',
                    created: 0,
                    modified: 0,
                    extra: {},
                    categoryKey: '任务/open',
                    folder: 'test'
                });
            }
            // 创建2个使用"低频主题"的任务
            for (let i = 0; i < 2; i++) {
                items.push({
                    id: `task_low${i}`,
                    type: 'task',
                    title: `任务${i}`,
                    header: '低频主题',
                    content: '',
                    tags: [],
                    recurrence: 'none',
                    created: 0,
                    modified: 0,
                    extra: {},
                    categoryKey: '任务/open',
                    folder: 'test'
                });
            }

            const createdThemes = await migration.autoCreateFrequentThemes(items, 5);
            
            expect(createdThemes).toContain('高频主题');
            expect(createdThemes).not.toContain('低频主题');
            
            // 验证在ThemeManager中
            const highFreqTheme = themeManager.getThemeByPath('高频主题');
            const lowFreqTheme = themeManager.getThemeByPath('低频主题');
            
            expect(highFreqTheme?.source).toBe('predefined');
            expect(highFreqTheme?.status).toBe('active');
            expect(lowFreqTheme?.source).toBe('discovered');
            expect(lowFreqTheme?.status).toBe('inactive');
        });
    });

    describe('清理冗余数据', () => {
        test('应该移除与主题相同的标签', () => {
            const items: Item[] = [
                {
                    id: 'block1',
                    type: 'block',
                    title: '块1',
                    theme: '工作',
                    content: '',
                    tags: ['工作', '重要', '紧急'],
                    recurrence: 'none',
                    created: 0,
                    modified: 0,
                    extra: {},
                    categoryKey: '块',
                    folder: 'test'
                }
            ];

            const cleaned = migration.cleanupAfterMigration(items, true);
            
            expect(cleaned[0].tags).toEqual(['重要', '紧急']);
            expect(cleaned[0].tags).not.toContain('工作');
        });

        test('不清理时应保留所有标签', () => {
            const items: Item[] = [
                {
                    id: 'block1',
                    type: 'block',
                    title: '块1',
                    theme: '工作',
                    content: '',
                    tags: ['工作', '重要'],
                    recurrence: 'none',
                    created: 0,
                    modified: 0,
                    extra: {},
                    categoryKey: '块',
                    folder: 'test'
                }
            ];

            const cleaned = migration.cleanupAfterMigration(items, false);
            
            expect(cleaned[0].tags).toEqual(['工作', '重要']);
        });
    });

    describe('迁移报告生成', () => {
        test('应该生成正确的迁移报告', () => {
            const stats = {
                total: 100,
                migrated: 80,
                skipped: 20,
                themesDiscovered: new Set(['主题1', '主题2', '主题3'])
            };

            const report = migration.generateMigrationReport(stats);
            
            expect(report).toContain('总数据项: 100');
            expect(report).toContain('已迁移: 80');
            expect(report).toContain('已跳过: 20');
            expect(report).toContain('迁移率: 80.00%');
            expect(report).toContain('主题1');
            expect(report).toContain('主题2');
            expect(report).toContain('主题3');
        });

        test('应该包含适当的建议', () => {
            const stats = {
                total: 100,
                migrated: 10,
                skipped: 90,
                themesDiscovered: new Set(Array.from({ length: 15 }, (_, i) => `主题${i}`))
            };

            const report = migration.generateMigrationReport(stats);
            
            expect(report).toContain('发现的主题较多，建议审查并激活常用主题');
            expect(report).toContain('大部分数据已有主题，系统状态良好');
        });
    });
});
