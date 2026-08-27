/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F031/unit
 */
import {
  buildHierarchyPathList,
  buildHierarchyPathSegments,
  getCommonHierarchyParentPath,
  getRelativeHierarchyPath,
  normalizeHierarchyPathValue,
  splitHierarchyPathValue,
} from '@/core/semantics/path';
import { normalizeGoalPath, requireGoalPath, splitGoalPath } from '@/core/goal/path';
import { splitHierarchyPath } from '@/core/fields/pathSemantics';

describe('hierarchy path semantics', () => {
  it('normalizes generic hierarchy paths without stripping semantic markers by default', () => {
    expect(normalizeHierarchyPathValue(' 学习 // 英语 / 听力 ')).toBe('学习/英语/听力');
    expect(normalizeHierarchyPathValue('#目标/年度')).toBe('#目标/年度');
    expect(splitHierarchyPathValue('生活/健康')).toEqual({
      path: '生活/健康',
      parts: ['生活', '健康'],
      root: '生活',
      leaf: '健康',
    });
  });

  it('keeps Goal separate from Tag syntax and rejects hash markers', () => {
    expect(normalizeGoalPath(' 学习 / 英语 ')).toBe('学习/英语');
    expect(normalizeGoalPath('#学习/英语')).toBeNull();
    expect(() => requireGoalPath('#学习/英语')).toThrow(/without #/);
    expect(splitGoalPath('学习/听力')).toEqual({
      goalPath: '学习/听力',
      rootGoal: '学习',
      leafGoal: '听力',
    });
    expect(splitHierarchyPath('#项目/插件')).toEqual({
      path: '#项目/插件',
      parts: ['#项目', '插件'],
      root: '#项目',
      leaf: '插件',
    });
  });

  it('uses Goal path as the only classified hierarchy wrapper', () => {
    expect(splitGoalPath(' 工作 / 插件 ')).toEqual({
      goalPath: '工作/插件',
      rootGoal: '工作',
      leafGoal: '插件',
    });
    expect(splitGoalPath(null)).toEqual({ goalPath: null, rootGoal: null, leafGoal: null });
  });

  it('builds hierarchy segments, parent lists and relative paths from one source of truth', () => {
    expect(buildHierarchyPathSegments('a/b/c')).toEqual([
      { name: 'a', fullPath: 'a', depth: 0 },
      { name: 'b', fullPath: 'a/b', depth: 1 },
      { name: 'c', fullPath: 'a/b/c', depth: 2 },
    ]);
    expect(buildHierarchyPathList('a/b/c')).toEqual(['a', 'a/b', 'a/b/c']);
    expect(getCommonHierarchyParentPath(['a/b/c', 'a/b/d'])).toBe('a/b');
    expect(getRelativeHierarchyPath('a/b/c', 'a')).toBe('b/c');
  });
});
