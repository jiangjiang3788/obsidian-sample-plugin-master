// test/unit/ThemeManager.test.ts
import { ThemeManager } from '@core/services/ThemeManager';
import { Theme } from '@core/domain/theme';
import { Item } from '@core/domain/schema';

describe('ThemeManager', () => {
    let manager: ThemeManager;

    beforeEach(() => {
        manager = new ThemeManager();
    });

    describe('预定义主题管理', () => {
        test('初始时应该没有主题', () => {
            const stats = manager.getThemeStats();
            expect(stats.total).toBe(0);
            expect(stats.predefined).toBe(0);
            expect(stats.active).toBe(0);
        });

        test('应能添加默认主题集', () => {
            manager.addDefaultThemes();
            const stats = manager.getThemeStats();
            expect(stats.total).toBe(5); // 工作、生活、学习、健康、项目
            expect(stats.predefined).toBe(5);
            expect(stats.active).toBe(5);
        });

        test('应能添加预定义主题', () => {
            const theme = manager.addPredefinedTheme('测试主题', '🧪');
            
            expect(theme).toBeDefined();
            expect(theme.path).toBe('测试主题');
            expect(theme.icon).toBe('🧪');
            expect(theme.status).toBe('active');
            expect(theme.source).toBe('predefined');
        });

        test('添加重复主题应更新现有主题', () => {
            const theme1 = manager.addPredefinedTheme('重复主题', '🔁');
            const theme2 = manager.addPredefinedTheme('重复主题', '🔄');
            
            expect(theme1.id).toBe(theme2.id);
            expect(theme2.icon).toBe('🔄');
        });

        test('应支持多层级主题路径', () => {
            const theme = manager.addPredefinedTheme('项目/前端/React');
            
            expect(theme.path).toBe('项目/前端/React');
            expect(theme.name).toBe('React');
        });
    });

    describe('主题发现机制', () => {
        test('应能发现新主题', () => {
            const theme = manager.discoverTheme('新发现的主题');
            
            expect(theme).toBeDefined();
            expect(theme.status).toBe('inactive');
            expect(theme.source).toBe('discovered');
            expect(theme.usageCount).toBe(1);
            expect(theme.lastUsed).toBeDefined();
        });

        test('发现已存在主题应增加使用次数', () => {
            const theme1 = manager.discoverTheme('重复发现');
            const count1 = theme1.usageCount;
            
            const theme2 = manager.discoverTheme('重复发现');
            
            expect(theme1.id).toBe(theme2.id);
            expect(theme2.usageCount).toBe(count1 + 1);
        });

        test('发现空主题应抛出错误', () => {
            expect(() => manager.discoverTheme('')).toThrow('主题路径不能为空');
            expect(() => manager.discoverTheme('  ')).toThrow('主题路径不能为空');
        });
    });

    describe('主题激活与停用', () => {
        test('应能激活主题', () => {
            const theme = manager.discoverTheme('待激活主题');
            manager.activateTheme('待激活主题');
            
            const updated = manager.getThemeByPath('待激活主题');
            expect(updated?.status).toBe('active');
        });

        test('激活发现的主题应改变其来源', () => {
            const theme = manager.discoverTheme('发现主题');
            manager.activateTheme('发现主题');
            
            const updated = manager.getThemeByPath('发现主题');
            expect(updated?.source).toBe('predefined');
        });

        test('应能停用非预定义主题', () => {
            const theme = manager.discoverTheme('待停用主题');
            manager.activateTheme('待停用主题');
            manager.deactivateTheme('待停用主题');
            
            const updated = manager.getThemeByPath('待停用主题');
            expect(updated?.status).toBe('inactive');
        });

        test('不能停用原始预定义主题', () => {
            const theme = manager.addPredefinedTheme('预定义主题');
            manager.deactivateTheme('预定义主题');
            
            const updated = manager.getThemeByPath('预定义主题');
            expect(updated?.status).toBe('active');
        });
    });

    describe('主题查询', () => {
        test('应返回所有激活主题', () => {
            manager.addPredefinedTheme('主题1');
            manager.addPredefinedTheme('主题2');
            manager.discoverTheme('主题3');
            
            const activeThemes = manager.getActiveThemes();
            const activeCount = activeThemes.filter(t => t.status === 'active').length;
            
            expect(activeCount).toBe(activeThemes.length);
        });

        test('激活主题应按使用次数排序', () => {
            manager.addPredefinedTheme('主题A');
            manager.addPredefinedTheme('主题B');
            
            // 更新使用次数
            manager.updateThemeUsage('主题B');
            manager.updateThemeUsage('主题B');
            manager.updateThemeUsage('主题A');
            
            const activeThemes = manager.getActiveThemes();
            const themeB = activeThemes.find(t => t.path === '主题B');
            const themeA = activeThemes.find(t => t.path === '主题A');
            
            expect(activeThemes[0].path).toBe('主题B');
            expect(themeB?.usageCount).toBeGreaterThan(themeA?.usageCount || 0);
        });

        test('应正确分类所有主题', () => {
            manager.addPredefinedTheme('预定义1');
            manager.addPredefinedTheme('预定义2');
            const discovered = manager.discoverTheme('发现1');
            manager.discoverTheme('发现2');
            manager.activateTheme('发现1');
            
            const allThemes = manager.getAllThemes();
            
            expect(allThemes.active.length).toBeGreaterThan(0);
            expect(allThemes.inactive.length).toBeGreaterThan(0);
            expect(allThemes.discovered.length).toBeGreaterThan(0);
        });
    });

    describe('从Item提取主题', () => {
        test('应从任务的header提取主题', () => {
            const item: Item = {
                id: 'test#1',
                type: 'task',
                title: '任务标题',
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
            
            const theme = manager.extractTheme(item);
            expect(theme).toBe('工作计划');
        });

        test('应从块的theme字段提取主题', () => {
            const item: Item = {
                id: 'test#2',
                type: 'block',
                title: '块标题',
                theme: '生活/日常',
                content: '',
                tags: [],
                recurrence: 'none',
                created: 0,
                modified: 0,
                extra: {},
                categoryKey: '块',
                folder: 'test'
            };
            
            const theme = manager.extractTheme(item);
            expect(theme).toBe('生活/日常');
        });

        test('无主题时应返回null', () => {
            const item: Item = {
                id: 'test#3',
                type: 'task',
                title: '任务标题',
                content: '',
                tags: [],
                recurrence: 'none',
                created: 0,
                modified: 0,
                extra: {},
                categoryKey: '任务/open',
                folder: 'test'
            };
            
            const theme = manager.extractTheme(item);
            expect(theme).toBeNull();
        });
    });

    describe('批量扫描主题', () => {
        test('应从数据项中发现所有主题', () => {
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
                    type: 'block',
                    title: '块1',
                    theme: '主题C',
                    content: '',
                    tags: [],
                    recurrence: 'none',
                    created: 0,
                    modified: 0,
                    extra: {},
                    categoryKey: '块',
                    folder: 'test'
                }
            ];
            
            manager.scanDataForThemes(items);
            
            expect(manager.getThemeByPath('主题A')).toBeDefined();
            expect(manager.getThemeByPath('主题B')).toBeDefined();
            expect(manager.getThemeByPath('主题C')).toBeDefined();
        });

        test('应正确更新主题使用统计', () => {
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
            
            manager.scanDataForThemes(items);
            
            const theme = manager.getThemeByPath('重复主题');
            expect(theme?.usageCount).toBe(1); // scanDataForThemes只发现一次
        });
    });

    describe('主题统计', () => {
        test('应返回正确的统计信息', () => {
            manager.clearThemes();
            manager.addPredefinedTheme('预定义1');
            manager.addPredefinedTheme('预定义2');
            manager.discoverTheme('发现1');
            manager.discoverTheme('发现2');
            manager.activateTheme('发现1');
            
            const stats = manager.getThemeStats();
            
            expect(stats.total).toBe(4);
            expect(stats.predefined).toBe(3); // 预定义2个 + 发现1被激活变为predefined
            expect(stats.discovered).toBe(1); // 只有发现2保持discovered
            expect(stats.active).toBe(3);
            expect(stats.inactive).toBe(1);
        });
    });

    describe('主题管理操作', () => {
        test('应能删除非预定义主题', () => {
            manager.discoverTheme('待删除主题');
            const result = manager.removeTheme('待删除主题');
            
            expect(result).toBe(true);
            expect(manager.getThemeByPath('待删除主题')).toBeUndefined();
        });

        test('不能删除预定义主题', () => {
            manager.addPredefinedTheme('预定义主题');
            const result = manager.removeTheme('预定义主题');
            
            expect(result).toBe(false);
            expect(manager.getThemeByPath('预定义主题')).toBeDefined();
        });

        test('应能更新主题图标', () => {
            manager.addPredefinedTheme('测试主题', '🔧');
            manager.updateThemeIcon('测试主题', '🎯');
            
            const theme = manager.getThemeByPath('测试主题');
            expect(theme?.icon).toBe('🎯');
        });
    });

    describe('主题层级结构', () => {
        test('应正确构建主题层级', () => {
            manager.addPredefinedTheme('父主题');
            manager.addPredefinedTheme('父主题/子主题1');
            manager.addPredefinedTheme('父主题/子主题2');
            
            const hierarchy = manager.getThemeHierarchy();
            
            // 根级别主题
            const rootThemes = hierarchy.get(null);
            expect(rootThemes?.some(t => t.path === '父主题')).toBe(true);
            
            // 子主题应有正确的父ID
            const parentTheme = manager.getThemeByPath('父主题');
            const childThemes = hierarchy.get(parentTheme?.id || '');
            expect(childThemes?.length).toBe(2);
        });
    });

    describe('导入导出', () => {
        test('应能导出所有主题', () => {
            manager.clearThemes();
            manager.addPredefinedTheme('主题1');
            manager.addPredefinedTheme('主题2');
            
            const exported = manager.exportThemes();
            
            expect(exported.length).toBe(2);
            expect(exported.some(t => t.path === '主题1')).toBe(true);
            expect(exported.some(t => t.path === '主题2')).toBe(true);
        });

        test('应能导入主题', () => {
            const themes: Theme[] = [
                {
                    id: 'imported_1',
                    path: '导入主题1',
                    name: '导入主题1',
                    parentId: null,
                    status: 'active',
                    source: 'predefined',
                    usageCount: 5,
                    order: 0
                },
                {
                    id: 'imported_2',
                    path: '导入主题2',
                    name: '导入主题2',
                    parentId: null,
                    status: 'inactive',
                    source: 'discovered',
                    usageCount: 2,
                    order: 1
                }
            ];
            
            manager.importThemes(themes);
            
            expect(manager.getThemeByPath('导入主题1')).toBeDefined();
            expect(manager.getThemeByPath('导入主题2')).toBeDefined();
        });

        test('导入重复ID的主题应被忽略', () => {
            const theme1: Theme = {
                id: 'duplicate_id',
                path: '主题1',
                name: '主题1',
                parentId: null,
                status: 'active',
                source: 'predefined',
                usageCount: 0,
                order: 0
            };
            
            const theme2: Theme = {
                id: 'duplicate_id',
                path: '主题2',
                name: '主题2',
                parentId: null,
                status: 'active',
                source: 'predefined',
                usageCount: 0,
                order: 1
            };
            
            manager.importThemes([theme1]);
            manager.importThemes([theme2]);
            
            const result = manager.getThemeByPath('主题1');
            expect(result).toBeDefined();
            expect(manager.getThemeByPath('主题2')).toBeUndefined();
        });
    });

    describe('清除主题', () => {
        test('清除后应没有任何主题', () => {
            manager.addPredefinedTheme('预定义主题');
            manager.discoverTheme('临时主题');
            const statsBefore = manager.getThemeStats();
            expect(statsBefore.total).toBeGreaterThan(0);
            
            manager.clearThemes();
            
            const statsAfter = manager.getThemeStats();
            expect(statsAfter.total).toBe(0);
            expect(statsAfter.discovered).toBe(0);
            expect(statsAfter.predefined).toBe(0);
            expect(manager.getThemeByPath('临时主题')).toBeUndefined();
            expect(manager.getThemeByPath('预定义主题')).toBeUndefined();
        });
    });
});
