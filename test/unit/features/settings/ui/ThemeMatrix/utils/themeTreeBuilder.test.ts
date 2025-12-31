/**
 * ThemeTreeBuilder 工具函数测试
 */
import {
    buildThemeTree,
    groupThemesByStatus,
    getDescendantIds,
    findNodeInTree,
    getTreeMaxDepth,
    flattenTree
} from '@/core/theme-matrix/themeTreeBuilder';
import type { ExtendedTheme, ThemeTreeNode } from '@/core/theme-matrix/theme.types';

describe('ThemeTreeBuilder Utils', () => {
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

    const mockThemes: ExtendedTheme[] = [
        createMockTheme('1', 'personal'),
        createMockTheme('2', 'personal/habits'),
        createMockTheme('3', 'personal/habits/morning'),
        createMockTheme('4', 'personal/habits/evening'),
        createMockTheme('5', 'personal/goals'),
        createMockTheme('6', 'work'),
        createMockTheme('7', 'work/projects'),
        createMockTheme('8', 'work/meetings', 'inactive'),
        createMockTheme('9', 'archive', 'inactive')
    ];

    describe('buildThemeTree', () => {
        it('应该构建正确的树结构', () => {
            const tree = buildThemeTree(mockThemes, new Set());
            
            // 根节点应该有3个：personal, work, archive
            expect(tree.length).toBe(3);
            
            // 检查根节点
            const personalNode = tree.find(n => n.theme.path === 'personal');
            const workNode = tree.find(n => n.theme.path === 'work');
            const archiveNode = tree.find(n => n.theme.path === 'archive');
            
            expect(personalNode).toBeDefined();
            expect(workNode).toBeDefined();
            expect(archiveNode).toBeDefined();
            
            // 检查 personal 的子节点
            expect(personalNode!.children.length).toBe(2); // habits 和 goals
            
            // 检查 habits 的子节点
            const habitsNode = personalNode!.children.find(n => n.theme.path === 'personal/habits');
            expect(habitsNode).toBeDefined();
            expect(habitsNode!.children.length).toBe(2); // morning 和 evening
        });

        it('应该正确设置节点层级', () => {
            const tree = buildThemeTree(mockThemes, new Set());
            
            const personalNode = tree.find(n => n.theme.path === 'personal');
            expect(personalNode!.level).toBe(0);
            
            const habitsNode = personalNode!.children.find(n => n.theme.path === 'personal/habits');
            expect(habitsNode!.level).toBe(1);
            
            const morningNode = habitsNode!.children.find(n => n.theme.path === 'personal/habits/morning');
            expect(morningNode!.level).toBe(2);
        });

        it('应该正确处理展开状态', () => {
            const expandedNodes = new Set(['1', '2']);
            const tree = buildThemeTree(mockThemes, expandedNodes);
            
            const personalNode = tree.find(n => n.theme.id === '1');
            const habitsNode = personalNode!.children.find(n => n.theme.id === '2');
            const goalsNode = personalNode!.children.find(n => n.theme.id === '5');
            
            expect(personalNode!.expanded).toBe(true);
            expect(habitsNode!.expanded).toBe(true);
            expect(goalsNode!.expanded).toBe(false);
        });

        it('应该处理空主题列表', () => {
            const tree = buildThemeTree([], new Set());
            expect(tree).toEqual([]);
        });

        it('应该正确处理只有根节点的情况', () => {
            const singleTheme = [createMockTheme('1', 'personal')];
            const tree = buildThemeTree(singleTheme, new Set());
            
            expect(tree.length).toBe(1);
            expect(tree[0].theme.path).toBe('personal');
            expect(tree[0].children).toEqual([]);
        });
    });

    describe('groupThemesByStatus', () => {
        it('应该按状态分组主题', () => {
            const tree = buildThemeTree(mockThemes, new Set());
            const { activeThemes, archivedThemes } = groupThemesByStatus(tree);
            
            // personal 和 work 是 active，archive 是 inactive
            expect(activeThemes.length).toBe(2);
            expect(archivedThemes.length).toBe(1);
            
            expect(activeThemes.map(n => n.theme.path)).toContain('personal');
            expect(activeThemes.map(n => n.theme.path)).toContain('work');
            expect(archivedThemes[0].theme.path).toBe('archive');
        });

        it('应该处理空树', () => {
            const { activeThemes, archivedThemes } = groupThemesByStatus([]);
            expect(activeThemes).toEqual([]);
            expect(archivedThemes).toEqual([]);
        });

        it('应该处理只有一种状态的情况', () => {
            const activeOnly = [
                createMockTheme('1', 'personal'),
                createMockTheme('2', 'work')
            ];
            const tree = buildThemeTree(activeOnly, new Set());
            const { activeThemes, archivedThemes } = groupThemesByStatus(tree);
            
            expect(activeThemes.length).toBe(2);
            expect(archivedThemes.length).toBe(0);
        });
    });

    describe('getDescendantIds', () => {
        it('应该获取所有子孙节点ID', () => {
            const tree = buildThemeTree(mockThemes, new Set());
            const personalNode = tree.find(n => n.theme.id === '1')!;
            
            const descendantIds = getDescendantIds(personalNode);
            
            // 应该包含：personal(1), goals(5), habits(2), evening(4), morning(3) - 按字母排序
            expect(descendantIds.sort()).toEqual(['1', '2', '3', '4', '5'].sort());
        });

        it('应该处理叶子节点', () => {
            const tree = buildThemeTree(mockThemes, new Set());
            const personalNode = tree.find(n => n.theme.id === '1')!;
            const habitsNode = personalNode.children.find(n => n.theme.id === '2')!;
            const morningNode = habitsNode.children.find(n => n.theme.id === '3')!;
            
            const descendantIds = getDescendantIds(morningNode);
            expect(descendantIds).toEqual(['3']); // 只有自己
        });

        it('应该处理只有一层子节点的情况', () => {
            const tree = buildThemeTree(mockThemes, new Set());
            const workNode = tree.find(n => n.theme.id === '6')!;
            
            const descendantIds = getDescendantIds(workNode);
            // work(6), meetings(8), projects(7) - 按字母排序
            expect(descendantIds.sort()).toEqual(['6', '7', '8'].sort());
        });
    });

    describe('findNodeInTree', () => {
        it('应该找到存在的节点', () => {
            const tree = buildThemeTree(mockThemes, new Set());
            
            // 查找根节点
            const personalNode = findNodeInTree(tree, '1');
            expect(personalNode).toBeDefined();
            expect(personalNode!.theme.path).toBe('personal');
            
            // 查找深层节点
            const morningNode = findNodeInTree(tree, '3');
            expect(morningNode).toBeDefined();
            expect(morningNode!.theme.path).toBe('personal/habits/morning');
        });

        it('应该返回null当节点不存在时', () => {
            const tree = buildThemeTree(mockThemes, new Set());
            const node = findNodeInTree(tree, 'non-existent');
            expect(node).toBeNull();
        });

        it('应该处理空树', () => {
            const node = findNodeInTree([], '1');
            expect(node).toBeNull();
        });

        it('应该能找到任意深度的节点', () => {
            const tree = buildThemeTree(mockThemes, new Set());
            
            // 测试各个层级
            expect(findNodeInTree(tree, '1')!.theme.path).toBe('personal'); // level 0
            expect(findNodeInTree(tree, '2')!.theme.path).toBe('personal/habits'); // level 1
            expect(findNodeInTree(tree, '3')!.theme.path).toBe('personal/habits/morning'); // level 2
        });
    });

    describe('getTreeMaxDepth', () => {
        it('应该计算正确的最大深度', () => {
            const tree = buildThemeTree(mockThemes, new Set());
            const maxDepth = getTreeMaxDepth(tree);
            
            // personal -> habits -> morning/evening 是最深的路径，深度为3
            expect(maxDepth).toBe(3);
        });

        it('应该处理空树', () => {
            const maxDepth = getTreeMaxDepth([]);
            expect(maxDepth).toBe(0);
        });

        it('应该处理只有根节点的树', () => {
            const singleTheme = [createMockTheme('1', 'personal')];
            const tree = buildThemeTree(singleTheme, new Set());
            const maxDepth = getTreeMaxDepth(tree);
            expect(maxDepth).toBe(1);
        });

        it('应该处理不平衡的树', () => {
            const themes = [
                createMockTheme('1', 'a'),
                createMockTheme('2', 'a/b'),
                createMockTheme('3', 'a/b/c'),
                createMockTheme('4', 'a/b/c/d'),
                createMockTheme('5', 'x')
            ];
            const tree = buildThemeTree(themes, new Set());
            const maxDepth = getTreeMaxDepth(tree);
            expect(maxDepth).toBe(4); // a -> b -> c -> d
        });
    });

    describe('flattenTree', () => {
        it('应该扁平化展开的节点', () => {
            const expandedNodes = new Set(['1', '2']);
            const tree = buildThemeTree(mockThemes, expandedNodes);
            const flattened = flattenTree(tree);
            
            // 应该包含：personal(展开), work, archive
            // personal 下：habits(展开), goals
            // habits 下：morning, evening
            const paths = flattened.map(n => n.theme.path);
            
            expect(paths).toContain('personal');
            expect(paths).toContain('personal/habits');
            expect(paths).toContain('personal/goals');
            expect(paths).toContain('personal/habits/morning');
            expect(paths).toContain('personal/habits/evening');
            expect(paths).toContain('work');
            expect(paths).toContain('archive');
        });

        it('应该不包含未展开节点的子节点', () => {
            const expandedNodes = new Set(['1']); // 只展开 personal
            const tree = buildThemeTree(mockThemes, expandedNodes);
            const flattened = flattenTree(tree);
            
            const paths = flattened.map(n => n.theme.path);
            
            // 应该包含 personal 的直接子节点
            expect(paths).toContain('personal/habits');
            expect(paths).toContain('personal/goals');
            
            // 不应该包含 habits 的子节点（因为 habits 未展开）
            expect(paths).not.toContain('personal/habits/morning');
            expect(paths).not.toContain('personal/habits/evening');
            
            // work 未展开，不应该包含其子节点
            expect(paths).toContain('work');
            expect(paths).not.toContain('work/projects');
        });

        it('应该处理全部折叠的树', () => {
            const tree = buildThemeTree(mockThemes, new Set());
            const flattened = flattenTree(tree);
            
            // 只应该包含根节点（按字母排序）
            expect(flattened.length).toBe(3);
            expect(flattened.map(n => n.theme.path).sort()).toEqual(['archive', 'personal', 'work']);
        });

        it('应该处理空树', () => {
            const flattened = flattenTree([]);
            expect(flattened).toEqual([]);
        });

        it('应该保持节点顺序', () => {
            const expandedNodes = new Set(['1', '6']);
            const tree = buildThemeTree(mockThemes, expandedNodes);
            const flattened = flattenTree(tree);
            
            const paths = flattened.map(n => n.theme.path);
            
            // personal 及其子节点应该在 work 之前
            const personalIndex = paths.indexOf('personal');
            const habitsIndex = paths.indexOf('personal/habits');
            const workIndex = paths.indexOf('work');
            
            expect(personalIndex).toBeLessThan(habitsIndex);
            expect(habitsIndex).toBeLessThan(workIndex);
        });
    });
});
