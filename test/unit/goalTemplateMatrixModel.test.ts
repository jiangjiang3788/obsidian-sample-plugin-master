/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F038/unit
 */
import {
  buildNextActiveBlockIds,
  filterVisibleGoalTemplateMatrixGoals,
  getPresetCardName,
  orderDraggedGoalSiblings,
  splitGoalsByRoot,
  toggleGoalPath,
  sortGoalsForMatrix,
} from '@/features/settings/goalTemplates/goalTemplateMatrixModel';

const goals = [
  { path: '学习', sortOrder: 0, status: 'active' },
  { path: '学习/英语', sortOrder: 10, status: 'active' },
  { path: '工作', sortOrder: 20, status: 'active' },
] as any[];
const blocks = [{ id: 'core.habit', name: '打卡' }, { id: 'core.task', name: '任务' }] as any[];
const templates = [
  { id: 'tpl-a', goalPath: '学习/英语', recordTypeId: 'core.habit', description: '听力记录', enabled: true },
] as any[];

describe('goalTemplateMatrixModel', () => {
  it('uses the RecordType name as the compact template fallback label', () => {
    expect(getPresetCardName(templates[0], goals[1], '打卡')).toBe('打卡');
  });

  it('filters visible goals by Goal text and template description', () => {
    const expanded = new Set(['学习', '工作']);
    expect(filterVisibleGoalTemplateMatrixGoals({ goals, expandedPaths: expanded, query: '听力', templates }).map((goal) => goal.path)).toEqual(['学习/英语']);
    expect(filterVisibleGoalTemplateMatrixGoals({ goals, expandedPaths: expanded, query: '工作', templates }).map((goal) => goal.path)).toEqual(['工作']);
  });

  it('keeps tree toggle logic pure', () => {
    expect(Array.from(toggleGoalPath(new Set(['学习']), '学习'))).toEqual([]);
  });

  it('keeps at least one block active when toggling chips', () => {
    expect(Array.from(buildNextActiveBlockIds(new Set(['core.habit', 'core.task']), 'core.habit', blocks))).toEqual(['core.task']);
    expect(Array.from(buildNextActiveBlockIds(new Set(['core.task']), 'core.task', blocks))).toEqual(['core.task']);
  });

  it('splits visible goals by root groups', () => {
    expect(splitGoalsByRoot(goals).map((group) => group.map((goal) => goal.path))).toEqual([['学习', '学习/英语'], ['工作']]);
  });

  it('orders dragged sibling goals without crossing parents', () => {
    expect(orderDraggedGoalSiblings({ goals, dragGoalPath: '工作', targetGoalPath: '学习', position: 'before' })?.map((goal) => goal.path)).toEqual(['工作', '学习']);
    expect(orderDraggedGoalSiblings({ goals, dragGoalPath: '学习/英语', targetGoalPath: '工作', position: 'after' })).toBeNull();
  });

  it('orders Goal rows as a hierarchy even when child sortOrder is globally smaller', () => {
    const unordered = [
      { path: '根A/子A', sortOrder: 0, status: 'active' },
      { path: '根B', sortOrder: 2, status: 'active' },
      { path: '根A', sortOrder: 1, status: 'active' },
      { path: '根A/子B', sortOrder: 10, status: 'active' },
    ] as any[];
    expect(sortGoalsForMatrix(unordered).map((goal) => goal.path)).toEqual(['根A', '根A/子A', '根A/子B', '根B']);
  });
});
