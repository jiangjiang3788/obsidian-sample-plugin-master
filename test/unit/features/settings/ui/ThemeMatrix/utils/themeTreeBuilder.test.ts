/**
 * themeTreeBuilder 工具函数测试
 */
import { 
    buildThemeTree, 
    groupThemesByStatus,
    getDescendantIds,
    findNodeInTree,
    getTreeMaxDepth,
    flattenTree
} from '@/src/features/settings/ui/ThemeMatrix/utils/themeTreeBuilder';
import type { ExtendedTheme, ThemeTreeNode } from '@/src/features/settings/ui/ThemeMatrix/types';

describe('themeTreeBuilder', () => {
    describe('buildThemeTree', () => {
        it('应该正确构建单层主题树', () => {
            const themes: ExtendedTheme[] = [
                { id: '1', path: 'personal', icon: '👤', status: 'active' },
                { id: '2', path: 'work', icon: '💼', status: 'active' }
            ];
            
            const tree = buildThemeTree(themes, new Set());
            
            expect(tree).toHaveLength(2);
            expect(tree[0].theme.path).toBe('personal');
            expect(tree[0].level).toBe(0);
            expect(tree[0].children).toHaveLength(0);
        });
        
        it('应该正确构建多层主题树', () => {
            const themes: ExtendedTheme[] = [
                { id: '1', path: 'personal', icon: '👤', status: 'active' },
                { id: '2', path: 'personal/habits', icon: '🔄', status: 'active' },
                { id: '3', path: 'personal/habits/morning', icon: '🌅', status: 'active' },
                { id: '4', path: 'work', icon: '💼', status: 'active' }
            ];
            
            const tree = buildThemeTree(themes, new Set());
            
            expect(tree).toHaveLength(2);
            expect(tree[0].theme.path).toBe('personal');
            expect(tree[0].children).toHaveLength(1);
            expect(tree[0].children[0].theme.path).toBe('personal/habits');
            expect(tree[0].children[0].children).toHaveLength(1);
            expect(tree[0].children[0].children[0].theme.path).toBe('personal/habits/morning');
        });
        
        it('应该正确处理展开状态', () => {
            const themes: ExtendedTheme[] = [
                { id: '1', path: 'personal', icon: '👤', status: 'active' },
                { id: '2', path: 'personal/habits', icon: '🔄', status: 'active' }
            ];
            
            const expandedNodes = new Set(['1']);
            const tree = buildThemeTree(themes, expandedNodes);
            
            expect(tree[0].expanded).toBe(true);
            expect(tree[0].children[0].expanded).toBe(false);
        });
    });
    
    describe('groupThemesByStatus', () => {
        it('应该正确分组激活和归档的主题', () => {
            const tree: ThemeTreeNode[] = [
                {
                    theme: { id: '1', path: 'personal', status: 'active' } as ExtendedTheme,
                    children: [],
                    expanded: false,
                    level: 0
                },
                {
                    theme: { id: '2', path: 'work', status: 'inactive' } as ExtendedTheme,
                    children: [],
                    expanded: false,
                    level: 0
                }
            ];
            
            const { activeThemes, archivedThemes } = groupThemesByStatus(tree);
            
            expect(activeThemes).toHaveLength(1);
            expect(archivedThemes).toHaveLength(1);
            expect(activeThemes[0].theme.path).toBe('personal');
            expect(archivedThemes[0].theme.path).toBe('work');
        });
    });
    
    describe('getDescendantIds', () => {
        it('应该返回节点及其所有子孙节点的ID', () => {
            const node: ThemeTreeNode = {
                theme: { id: '1', path: 'personal' } as ExtendedTheme,
                children: [
                    {
                        theme: { id: '2', path: 'personal/habits' } as ExtendedTheme,
                        children: [
                            {
                                theme: { id: '3', path: 'personal/habits/morning' } as ExtendedTheme,
                                children: [],
                                expanded: false,
                                level: 2
                            }
                        ],
                        expanded: false,
                        level: 1
                    }
                ],
                expanded: false,
                level: 0
            };
            
            const ids = getDescendantIds(node);
            
            expect(ids).toEqual(['1', '2', '3']);
        });
    });
    
    describe('findNodeInTree', () => {
        it('应该在树中找到指定的节点', () => {
            const tree: ThemeTreeNode[] = [
                {
                    theme: { id: '1', path: 'personal' } as ExtendedTheme,
                    children: [
                        {
                            theme: { id: '2', path: 'personal/habits' } as ExtendedTheme,
                            children: [],
                            expanded: false,
                            level: 1
                        }
                    ],
                    expanded: false,
                    level: 0
                }
            ];
            
            const node = findNodeInTree(tree, '2');
            
            expect(node).not.toBeNull();
            expect(node?.theme.id).toBe('2');
            expect(node?.theme.path).toBe('personal/habits');
        });
        
        it('应该在找不到节点时返回null', () => {
            const tree: ThemeTreeNode[] = [];
            const node = findNodeInTree(tree, 'nonexistent');
            expect(node).toBeNull();
        });
    });
    
    describe('getTreeMaxDepth', () => {
        it('应该返回树的最大深度', () => {
            const tree: ThemeTreeNode[] = [
                {
                    theme: { id: '1', path: 'personal' } as ExtendedTheme,
                    children: [
                        {
                            theme: { id: '2', path: 'personal/habits' } as ExtendedTheme,
                            children: [
                                {
                                    theme: { id: '3', path: 'personal/habits/morning' } as ExtendedTheme,
                                    children: [],
                                    expanded: false,
                                    level: 2
                                }
                            ],
                            expanded: false,
                            level: 1
                        }
                    ],
                    expanded: false,
                    level: 0
                }
            ];
            
            const depth = getTreeMaxDepth(tree);
            expect(depth).toBe(3);
        });
        
        it('应该为空树返回0', () => {
            const depth = getTreeMaxDepth([]);
            expect(depth).toBe(0);
        });
    });
    
    describe('flattenTree', () => {
        it('应该将树扁平化为数组（只包含展开的节点）', () => {
            const tree: ThemeTreeNode[] = [
                {
                    theme: { id: '1', path: 'personal' } as ExtendedTheme,
                    children: [
                        {
                            theme: { id: '2', path: 'personal/habits' } as ExtendedTheme,
                            children: [],
                            expanded: false,
                            level: 1
                        }
                    ],
                    expanded: true,
                    level: 0
                },
                {
                    theme: { id: '3', path: 'work' } as ExtendedTheme,
                    children: [],
                    expanded: false,
                    level: 0
                }
            ];
            
            const flattened = flattenTree(tree);
            
            expect(flattened).toHaveLength(3);
            expect(flattened[0].theme.id).toBe('1');
            expect(flattened[1].theme.id).toBe('2');
            expect(flattened[2].theme.id).toBe('3');
        });
        
        it('应该不包含未展开节点的子节点', () => {
            const tree: ThemeTreeNode[] = [
                {
                    theme: { id: '1', path: 'personal' } as ExtendedTheme,
                    children: [
                        {
                            theme: { id: '2', path: 'personal/habits' } as ExtendedTheme,
                            children: [],
                            expanded: false,
                            level: 1
                        }
                    ],
                    expanded: false, // 未展开
                    level: 0
                }
            ];
            
            const flattened = flattenTree(tree);
            
            expect(flattened).toHaveLength(1);
            expect(flattened[0].theme.id).toBe('1');
        });
    });
});
