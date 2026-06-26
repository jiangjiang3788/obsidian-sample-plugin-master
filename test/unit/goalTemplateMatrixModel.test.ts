import {
  buildNextActiveBlockIds,
  filterVisibleGoalTemplateMatrixGoals,
  getPresetCardName,
  goalTemplateKey,
  orderDraggedGoalSiblings,
  reorderPresetTemplatesInCell,
  splitGoalsByRoot,
  toggleGoalCollapsed,
  toggleGoalPath,
} from '@/features/settings/goalTemplates/goalTemplateMatrixModel';

const goals = [
  { id: 'g1', title: '学习', goalPath: '学习', sortOrder: 0, status: 'active' },
  { id: 'g2', title: '英语', goalPath: '学习/英语', sortOrder: 10, status: 'active', themePath: '学习/英语' },
  { id: 'g3', title: '工作', goalPath: '工作', sortOrder: 20, status: 'active' },
] as any[];

const blocks = [
  { id: 'core.habit', name: '打卡' },
  { id: 'core.task', name: '任务' },
] as any[];

const templates = [
  { id: 'tpl-a', goalId: 'g2', coreBlockId: 'core.habit', variantId: 'a', name: '预设 1', defaultValues: { themePath: '学习/英语/听力' }, sortOrder: 10, enabled: true },
  { id: 'tpl-b', goalId: 'g2', coreBlockId: 'core.habit', variantId: 'b', name: '阅读', defaultValues: { themePath: '学习/英语/阅读' }, sortOrder: 20, enabled: true },
] as any[];

describe('goalTemplateMatrixModel', () => {
  it('uses theme leaf as card name when preset name is generated', () => {
    expect(getPresetCardName(templates[0], goals[1])).toBe('听力');
    expect(getPresetCardName(templates[1], goals[1])).toBe('阅读');
  });

  it('filters visible goals by goal text and preset text', () => {
    const expanded = new Set(['学习', '工作']);
    expect(filterVisibleGoalTemplateMatrixGoals({ goals, expandedPaths: expanded, query: '听力', templates }).map((goal) => goal.id)).toEqual(['g2']);
    expect(filterVisibleGoalTemplateMatrixGoals({ goals, expandedPaths: expanded, query: '工作', templates }).map((goal) => goal.id)).toEqual(['g3']);
  });

  it('keeps tree and row toggle logic pure', () => {
    expect(Array.from(toggleGoalPath(new Set(['学习']), '学习'))).toEqual([]);
    expect(Array.from(toggleGoalCollapsed(new Set(), 'g2'))).toEqual(['g2']);
  });

  it('keeps at least one block active when toggling chips', () => {
    expect(Array.from(buildNextActiveBlockIds(new Set(['core.habit', 'core.task']), 'core.habit', blocks))).toEqual(['core.task']);
    expect(Array.from(buildNextActiveBlockIds(new Set(['core.task']), 'core.task', blocks))).toEqual(['core.task']);
  });

  it('splits visible goals by root goal groups', () => {
    expect(splitGoalsByRoot(goals).map((group) => group.map((goal) => goal.id))).toEqual([['g1', 'g2'], ['g3']]);
  });

  it('orders dragged sibling goals without crossing parents', () => {
    expect(orderDraggedGoalSiblings({ goals, dragGoalId: 'g3', targetGoalId: 'g1', position: 'before' })?.map((goal) => goal.id)).toEqual(['g3', 'g1']);
    expect(orderDraggedGoalSiblings({ goals, dragGoalId: 'g2', targetGoalId: 'g3', position: 'after' })).toBeNull();
  });

  it('reorders presets in one cell and normalizes sortOrder', () => {
    const next = reorderPresetTemplatesInCell({ templates, goals, drag: { goalId: 'g2', blockId: 'core.habit', templateKey: goalTemplateKey(templates[1]) }, targetTemplateKey: goalTemplateKey(templates[0]), position: 'before' });
    expect(next?.map((template) => template.id)).toEqual(['tpl-b', 'tpl-a']);
    expect(next?.map((template) => template.sortOrder)).toEqual([0, 10]);
  });
});
