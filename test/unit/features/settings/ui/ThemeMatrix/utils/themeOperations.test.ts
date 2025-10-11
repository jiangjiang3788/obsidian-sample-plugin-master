/**
 * ThemeOperations 工具函数测试
 */
import {
    createOverrideKey,
    parseOverrideKey,
    createOverridesMap,
    validateThemePath,
    getParentPath,
    getThemeDisplayName,
    hasChildren,
    getSelectionState,
    toggleThemeSelection,
    filterThemes,
    sortThemes
} from '@features/settings/ui/ThemeMatrix/utils/themeOperations';
import { buildThemeTree } from '@features/settings/ui/ThemeMatrix/utils/themeTreeBuilder';
import type { ExtendedTheme, ThemeTreeNode } from '@features/settings/ui/ThemeMatrix/types';
import type { ThemeOverride } from '@core/domain/schema';

describe('ThemeOperations Utils', () => {
    // 创建测试数据
    const createMockTheme = (
        id: string,
        path: string,
        status: 'active' | 'inactive' = 'active'
    ): ExtendedTheme => ({
        id,
        path,
        icon: '📁',
        status,
        source: 'predefined',
        usageCount: 0,
        lastUsed: undefined
    });

    const createMockOverride = (
        themeId: string,
        blockId: string
    ): ThemeOverride => ({
        id: `${themeId}-${blockId}`,
        themeId,
        blockId,
        status: 'enabled',
        outputTemplate: '',
        targetFile: '',
        appendUnderHeader: ''
    });

    describe('createOverrideKey & parseOverrideKey', () => {
        it('应该创建和解析覆盖键', () => {
            const themeId = 'theme-123';
            const blockId = 'block-456';
            
            const key = createOverrideKey(themeId, blockId);
            expect(key).toBe('theme-123:block-456');
            
            const parsed = parseOverrideKey(key);
            expect(parsed).toEqual({ themeId, blockId });
        });

        it('应该处理包含冒号的ID', () => {
            const key = createOverrideKey('theme:123', 'block:456');
            expect(key).toBe('theme:123:block:456');
            
            // 注意：解析时只会在第一个冒号处分割
            const parsed = parseOverrideKey(key);
            expect(parsed.themeId).toBe('theme');
            expect(parsed.blockId).toBe('123:block:456');
        });
    });

    describe('createOverridesMap', () => {
        it('应该创建覆盖映射', () => {
            const overrides: ThemeOverride[] = [
                createMockOverride('theme1', 'block1'),
                createMockOverride('theme1', 'block2'),
                createMockOverride('theme2', 'block1')
            ];
            
            const map = createOverridesMap(overrides);
            
            expect(map.size).toBe(3);
            expect(map.get('theme1:block1')).toBeDefined();
            expect(map.get('theme1:block2')).toBeDefined();
            expect(map.get('theme2:block1')).toBeDefined();
            expect(map.get('theme2:block2')).toBeUndefined();
        });

        it('应该处理空数组', () => {
            const map = createOverridesMap([]);
            expect(map.size).toBe(0);
        });

        it('应该处理重复的覆盖（后者覆盖前者）', () => {
            const override1 = createMockOverride('theme1', 'block1');
            override1.outputTemplate = 'template1';
            
            const override2 = createMockOverride('theme1', 'block1');
            override2.outputTemplate = 'template2';
            
            const map = createOverridesMap([override1, override2]);
            
            expect(map.size).toBe(1);
            expect(map.get('theme1:block1')?.outputTemplate).toBe('template2');
        });
    });

    describe('validateThemePath', () => {
        it('应该验证有效路径', () => {
            expect(validateThemePath('personal')).toBe(true);
            expect(validateThemePath('personal/habits')).toBe(true);
            expect(validateThemePath('work_projects')).toBe(true);
            expect(validateThemePath('2024goals')).toBe(true);
            expect(validateThemePath('个人/习惯')).toBe(true);
        });

        it('应该拒绝无效路径', () => {
            expect(validateThemePath('')).toBe(false);
            expect(validateThemePath('   ')).toBe(false);
            expect(validateThemePath('/personal')).toBe(false);
            expect(validateThemePath('personal/')).toBe(false);
            expect(validateThemePath('personal//habits')).toBe(false);
            expect(validateThemePath('personal habits')).toBe(false); // 包含空格
            expect(validateThemePath('personal-habits')).toBe(false); // 包含连字符
            expect(validateThemePath('personal.habits')).toBe(false); // 包含点
        });
    });

    describe('getParentPath', () => {
        it('应该返回父路径', () => {
            expect(getParentPath('personal/habits/morning')).toBe('personal/habits');
            expect(getParentPath('personal/habits')).toBe('personal');
        });

        it('应该返回null当没有父路径时', () => {
            expect(getParentPath('personal')).toBeNull();
            expect(getParentPath('')).toBeNull();
        });
    });

    describe('getThemeDisplayName', () => {
        it('应该返回显示名称', () => {
            expect(getThemeDisplayName('personal/habits/morning')).toBe('morning');
            expect(getThemeDisplayName('personal/habits')).toBe('habits');
            expect(getThemeDisplayName('personal')).toBe('personal');
        });

        it('应该处理空路径', () => {
            expect(getThemeDisplayName('')).toBe('');
        });
    });

    describe('hasChildren', () => {
        it('应该检测是否有子主题', () => {
            const themes: ExtendedTheme[] = [
                createMockTheme('1', 'personal'),
                createMockTheme('2', 'personal/habits'),
                createMockTheme('3', 'work')
            ];
            
            expect(hasChildren(themes[0], themes)).toBe(true); // personal 有 habits
            expect(hasChildren(themes[1], themes)).toBe(false); // habits 没有子主题
            expect(hasChildren(themes[2], themes)).toBe(false); // work 没有子主题
        });

        it('应该正确区分相似路径', () => {
            const themes: ExtendedTheme[] = [
                createMockTheme('1', 'personal'),
                createMockTheme('2', 'personalinfo'), // 不是 personal 的子主题
                createMockTheme('3', 'personal2') // 不是 personal 的子主题
            ];
            
            expect(hasChildren(themes[0], themes)).toBe(false);
        });
    });

    describe('getSelectionState', () => {
        const themes: ExtendedTheme[] = [
            createMockTheme('1', 'personal'),
            createMockTheme('2', 'personal/habits'),
            createMockTheme('3', 'personal/habits/morning'),
            createMockTheme('4', 'personal/goals'),
            createMockTheme('5', 'work')
        ];
        const tree = buildThemeTree(themes, new Set());

        it('应该返回 checked 当节点被选中时', () => {
            const selected = new Set(['1']);
            const state = getSelectionState('1', tree, selected);
            expect(state).toBe('checked');
        });

        it('应该返回 unchecked 当节点未被选中且无子节点被选中时', () => {
            const selected = new Set(['5']);
            const state = getSelectionState('1', tree, selected);
            expect(state).toBe('unchecked');
        });

        it('应该返回 indeterminate 当有子节点被选中时', () => {
            const selected = new Set(['3']); // morning 被选中
            const state = getSelectionState('1', tree, selected); // personal
            expect(state).toBe('indeterminate');
            
            const state2 = getSelectionState('2', tree, selected); // habits
            expect(state2).toBe('indeterminate');
        });

        it('应该返回 unchecked 当节点不存在时', () => {
            const selected = new Set(['1']);
            const state = getSelectionState('non-existent', tree, selected);
            expect(state).toBe('unchecked');
        });
    });

    describe('toggleThemeSelection', () => {
        const themes: ExtendedTheme[] = [
            createMockTheme('1', 'personal'),
            createMockTheme('2', 'personal/habits'),
            createMockTheme('3', 'personal/habits/morning'),
            createMockTheme('4', 'personal/goals'),
            createMockTheme('5', 'work')
        ];
        const tree = buildThemeTree(themes, new Set());

        it('应该选择节点及其所有子节点', () => {
            const selected = new Set<string>();
            const newSelected = toggleThemeSelection('1', tree, selected, true);
            
            // 应该选中 personal 及其所有子节点
            expect(newSelected.has('1')).toBe(true);
            expect(newSelected.has('2')).toBe(true);
            expect(newSelected.has('3')).toBe(true);
            expect(newSelected.has('4')).toBe(true);
            expect(newSelected.has('5')).toBe(false);
        });

        it('应该取消选择节点及其所有子节点', () => {
            const selected = new Set(['1', '2', '3', '4']);
            const newSelected = toggleThemeSelection('1', tree, selected, true);
            
            // 应该取消选中 personal 及其所有子节点
            expect(newSelected.has('1')).toBe(false);
            expect(newSelected.has('2')).toBe(false);
            expect(newSelected.has('3')).toBe(false);
            expect(newSelected.has('4')).toBe(false);
        });

        it('应该只切换单个节点当 includeChildren 为 false', () => {
            const selected = new Set<string>();
            const newSelected = toggleThemeSelection('1', tree, selected, false);
            
            expect(newSelected.has('1')).toBe(true);
            expect(newSelected.has('2')).toBe(false);
            expect(newSelected.has('3')).toBe(false);
        });

        it('应该处理不存在的节点', () => {
            const selected = new Set(['1']);
            const newSelected = toggleThemeSelection('non-existent', tree, selected);
            
            expect(newSelected).toEqual(selected);
        });
    });

    describe('filterThemes', () => {
        const themes: ExtendedTheme[] = [
            createMockTheme('1', 'personal'),
            createMockTheme('2', 'work'),
            createMockTheme('3', 'archive'),
            createMockTheme('4', 'personal/habits')
        ];
        themes[2].status = 'inactive';
        themes[0].icon = '👤';
        themes[1].icon = '💼';

        it('应该按状态过滤', () => {
            const active = filterThemes(themes, { status: 'active' });
            expect(active.length).toBe(3);
            expect(active.map(t => t.id)).not.toContain('3');
            
            const inactive = filterThemes(themes, { status: 'inactive' });
            expect(inactive.length).toBe(1);
            expect(inactive[0].id).toBe('3');
        });

        it('应该按搜索文本过滤', () => {
            const result = filterThemes(themes, { searchText: 'personal' });
            expect(result.length).toBe(2);
            expect(result.map(t => t.id)).toContain('1');
            expect(result.map(t => t.id)).toContain('4');
        });

        it('应该按图标搜索', () => {
            const result = filterThemes(themes, { searchText: '👤' });
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('1');
        });

        it('应该支持大小写不敏感搜索', () => {
            const result = filterThemes(themes, { searchText: 'WORK' });
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('2');
        });

        it('应该支持组合过滤', () => {
            const result = filterThemes(themes, {
                status: 'active',
                searchText: 'personal'
            });
            expect(result.length).toBe(2);
            expect(result.map(t => t.id)).toContain('1');
            expect(result.map(t => t.id)).toContain('4');
        });

        it('应该返回所有主题当没有过滤条件时', () => {
            const result = filterThemes(themes, {});
            expect(result).toEqual(themes);
        });
    });

    describe('sortThemes', () => {
        const themes: ExtendedTheme[] = [
            { ...createMockTheme('1', 'zebra'), usageCount: 5, lastUsed: 1000 },
            { ...createMockTheme('2', 'apple'), usageCount: 10, lastUsed: 2000 },
            { ...createMockTheme('3', 'banana'), usageCount: 3, lastUsed: 1500, status: 'inactive' }
        ];

        it('应该按路径排序', () => {
            const sorted = sortThemes(themes, 'path', 'asc');
            expect(sorted[0].path).toBe('apple');
            expect(sorted[1].path).toBe('banana');
            expect(sorted[2].path).toBe('zebra');
            
            const sortedDesc = sortThemes(themes, 'path', 'desc');
            expect(sortedDesc[0].path).toBe('zebra');
            expect(sortedDesc[2].path).toBe('apple');
        });

        it('应该按状态排序', () => {
            const sorted = sortThemes(themes, 'status', 'asc');
            expect(sorted[0].status).toBe('active');
            expect(sorted[2].status).toBe('inactive');
        });

        it('应该按使用次数排序', () => {
            const sorted = sortThemes(themes, 'usageCount', 'asc');
            expect(sorted[0].usageCount).toBe(3);
            expect(sorted[1].usageCount).toBe(5);
            expect(sorted[2].usageCount).toBe(10);
            
            const sortedDesc = sortThemes(themes, 'usageCount', 'desc');
            expect(sortedDesc[0].usageCount).toBe(10);
            expect(sortedDesc[2].usageCount).toBe(3);
        });

        it('应该按最后使用时间排序', () => {
            const sorted = sortThemes(themes, 'lastUsed', 'asc');
            expect(sorted[0].lastUsed).toBe(1000);
            expect(sorted[1].lastUsed).toBe(1500);
            expect(sorted[2].lastUsed).toBe(2000);
        });

        it('应该处理 undefined 值', () => {
            const themesWithUndefined = [
                { ...createMockTheme('1', 'a'), usageCount: undefined },
                { ...createMockTheme('2', 'b'), usageCount: 5 },
                { ...createMockTheme('3', 'c'), usageCount: undefined }
            ];
            
            const sorted = sortThemes(themesWithUndefined, 'usageCount', 'asc');
            expect(sorted[0].usageCount).toBe(0);
            expect(sorted[1].usageCount).toBe(0);
            expect(sorted[2].usageCount).toBe(5);
        });

        it('应该不修改原数组', () => {
            const original = [...themes];
            sortThemes(themes, 'path', 'asc');
            expect(themes).toEqual(original);
        });
    });
});
