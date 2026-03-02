/**
 * ThemeTreeBuilder 单元测试
 */
import { 
    ThemeTreeBuilder, 
    buildThemeTree, 
    flattenThemeTree,
    searchThemeTree,
    ThemeTreeNode,
} from '@/core/theme/ThemeTreeBuilder';
import type { ThemeDefinition } from '@/core/types/schema';

// 创建测试用的主题定义
function createTheme(id: string, path: string): ThemeDefinition {
    return {
        id,
        path,
        icon: '📁',
    };
}

describe('ThemeTreeBuilder', () => {
    describe('buildTree', () => {
        it('空 themes 返回空树', () => {
            const result = ThemeTreeBuilder.buildTree([]);
            expect(result).toEqual([]);
        });

        it('单层 path 返回正确节点', () => {
            const themes = [
                createTheme('1', 'work'),
                createTheme('2', 'personal'),
            ];
            
            const result = ThemeTreeBuilder.buildTree(themes);
            
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('personal');
            expect(result[0].label).toBe('personal');
            expect(result[0].themeId).toBe('2');
            expect(result[0].depth).toBe(0);
            expect(result[0].children).toHaveLength(0);
            
            expect(result[1].id).toBe('work');
            expect(result[1].themeId).toBe('1');
        });

        it('多层 path 返回正确层级、depth、children', () => {
            const themes = [
                createTheme('1', 'work'),
                createTheme('2', 'work/project'),
                createTheme('3', 'work/project/task'),
            ];
            
            const result = ThemeTreeBuilder.buildTree(themes);
            
            // 根节点
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('work');
            expect(result[0].depth).toBe(0);
            expect(result[0].themeId).toBe('1');
            
            // 第二层
            expect(result[0].children).toHaveLength(1);
            expect(result[0].children[0].id).toBe('work/project');
            expect(result[0].children[0].depth).toBe(1);
            expect(result[0].children[0].themeId).toBe('2');
            
            // 第三层
            expect(result[0].children[0].children).toHaveLength(1);
            expect(result[0].children[0].children[0].id).toBe('work/project/task');
            expect(result[0].children[0].children[0].depth).toBe(2);
            expect(result[0].children[0].children[0].themeId).toBe('3');
        });

        it('重复 path 去重（后者覆盖前者的 themeId）', () => {
            const themes = [
                createTheme('1', 'work'),
                createTheme('2', 'work'), // 重复路径
            ];
            
            const result = ThemeTreeBuilder.buildTree(themes);
            
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('work');
            // 后者的 themeId 应该覆盖
            expect(result[0].themeId).toBe('2');
        });

        it('排序稳定性（输入乱序，输出按路径稳定排序）', () => {
            const themes = [
                createTheme('3', 'zebra'),
                createTheme('1', 'apple'),
                createTheme('2', 'banana'),
            ];
            
            const result = ThemeTreeBuilder.buildTree(themes);
            
            expect(result).toHaveLength(3);
            expect(result[0].id).toBe('apple');
            expect(result[1].id).toBe('banana');
            expect(result[2].id).toBe('zebra');
        });

        it('创建虚节点（中间层节点无对应主题）', () => {
            const themes = [
                createTheme('1', 'work/project/task'),
                // 没有 work 和 work/project 的主题
            ];
            
            const result = ThemeTreeBuilder.buildTree(themes);
            
            // 应该创建虚节点
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('work');
            expect(result[0].themeId).toBeNull(); // 虚节点
            
            expect(result[0].children[0].id).toBe('work/project');
            expect(result[0].children[0].themeId).toBeNull(); // 虚节点
            
            expect(result[0].children[0].children[0].id).toBe('work/project/task');
            expect(result[0].children[0].children[0].themeId).toBe('1'); // 真实节点
        });

        it('混合深度的主题正确构建', () => {
            const themes = [
                createTheme('1', 'a'),
                createTheme('2', 'a/b'),
                createTheme('3', 'a/b/c'),
                createTheme('4', 'x'),
                createTheme('5', 'x/y'),
            ];
            
            const result = ThemeTreeBuilder.buildTree(themes);
            
            expect(result).toHaveLength(2);
            
            // a 分支
            const aNode = result[0];
            expect(aNode.id).toBe('a');
            expect(aNode.children).toHaveLength(1);
            expect(aNode.children[0].id).toBe('a/b');
            expect(aNode.children[0].children[0].id).toBe('a/b/c');
            
            // x 分支
            const xNode = result[1];
            expect(xNode.id).toBe('x');
            expect(xNode.children).toHaveLength(1);
            expect(xNode.children[0].id).toBe('x/y');
        });
    });

    describe('flattenTree', () => {
        it('扁平化树节点', () => {
            const themes = [
                createTheme('1', 'a'),
                createTheme('2', 'a/b'),
                createTheme('3', 'a/b/c'),
            ];
            const tree = ThemeTreeBuilder.buildTree(themes);
            
            // 全部展开
            const result = ThemeTreeBuilder.flattenTree(tree);
            
            expect(result).toHaveLength(3);
            expect(result[0].id).toBe('a');
            expect(result[1].id).toBe('a/b');
            expect(result[2].id).toBe('a/b/c');
        });

        it('根据 expandedIds 控制可见性', () => {
            const themes = [
                createTheme('1', 'a'),
                createTheme('2', 'a/b'),
            ];
            const tree = ThemeTreeBuilder.buildTree(themes);
            
            // 不展开 a
            const result = ThemeTreeBuilder.flattenTree(tree, new Set());
            
            expect(result).toHaveLength(2);
            expect(result[0].visible).toBe(true);
            expect(result[1].visible).toBe(false); // a/b 不可见因为 a 未展开
        });
    });

    describe('searchTree', () => {
        it('搜索匹配标签的节点', () => {
            const themes = [
                createTheme('1', 'work'),
                createTheme('2', 'personal'),
                createTheme('3', 'work/project'),
            ];
            const tree = ThemeTreeBuilder.buildTree(themes);
            
            const result = ThemeTreeBuilder.searchTree(tree, 'work');
            
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('work');
            expect(result[0].children).toHaveLength(1);
        });

        it('空搜索词返回原树', () => {
            const themes = [createTheme('1', 'work')];
            const tree = ThemeTreeBuilder.buildTree(themes);
            
            const result = ThemeTreeBuilder.searchTree(tree, '');
            
            expect(result).toEqual(tree);
        });

        it('搜索大小写不敏感', () => {
            const themes = [createTheme('1', 'Work')];
            const tree = ThemeTreeBuilder.buildTree(themes);
            
            const result = ThemeTreeBuilder.searchTree(tree, 'work');
            
            expect(result).toHaveLength(1);
        });
    });

    describe('findNodeByThemeId', () => {
        it('找到存在的节点', () => {
            const themes = [
                createTheme('1', 'a'),
                createTheme('2', 'a/b'),
            ];
            const tree = ThemeTreeBuilder.buildTree(themes);
            
            const result = ThemeTreeBuilder.findNodeByThemeId(tree, '2');
            
            expect(result).not.toBeNull();
            expect(result?.id).toBe('a/b');
        });

        it('未找到返回 null', () => {
            const themes = [createTheme('1', 'a')];
            const tree = ThemeTreeBuilder.buildTree(themes);
            
            const result = ThemeTreeBuilder.findNodeByThemeId(tree, 'nonexistent');
            
            expect(result).toBeNull();
        });
    });

    describe('getAncestorPaths', () => {
        it('返回祖先路径', () => {
            const result = ThemeTreeBuilder.getAncestorPaths('a/b/c');
            
            expect(result).toEqual(['a', 'a/b']);
        });

        it('根节点返回空数组', () => {
            const result = ThemeTreeBuilder.getAncestorPaths('root');
            
            expect(result).toEqual([]);
        });
    });

    describe('getLeafNodes', () => {
        it('返回所有叶子节点', () => {
            const themes = [
                createTheme('1', 'a'),
                createTheme('2', 'a/b'),
            ];
            const tree = ThemeTreeBuilder.buildTree(themes);
            
            const result = ThemeTreeBuilder.getLeafNodes(tree);
            
            expect(result).toHaveLength(2);
            expect(result.map(n => n.themeId)).toContain('1');
            expect(result.map(n => n.themeId)).toContain('2');
        });
    });

    describe('便捷函数', () => {
        it('buildThemeTree 便捷函数正常工作', () => {
            const themes = [createTheme('1', 'test')];
            const result = buildThemeTree(themes);
            
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('test');
        });

        it('flattenThemeTree 便捷函数正常工作', () => {
            const themes = [createTheme('1', 'a'), createTheme('2', 'a/b')];
            const tree = buildThemeTree(themes);
            const result = flattenThemeTree(tree);
            
            expect(result).toHaveLength(2);
        });

        it('searchThemeTree 便捷函数正常工作', () => {
            const themes = [createTheme('1', 'work')];
            const tree = buildThemeTree(themes);
            const result = searchThemeTree(tree, 'work');
            
            expect(result).toHaveLength(1);
        });
    });
});
