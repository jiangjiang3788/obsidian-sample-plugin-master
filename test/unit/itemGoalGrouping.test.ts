import { buildGoalBuckets, getItemGoalKey, UNASSIGNED_GOAL_KEY } from '../../src/core/goal';

const goals: any[] = [
  { id: 'goal-a', title: '目标A', goalPath: '项目/目标A', themePath: '工作/插件' },
];

describe('item goal grouping', () => {
  it('prefers goalPath over legacy goal IDs', () => {
    const item: any = { goalPath: '项目/目标B', goalId: 'goal-a', extra: {} };
    expect(getItemGoalKey(item, goals)).toBe('项目/目标B');
  });

  it('maps goalId when no goal path exists', () => {
    const item: any = { goalId: 'goal-a', extra: {} };
    expect(getItemGoalKey(item, goals)).toBe('项目/目标A');
  });

  it('adds unassigned bucket only for statistics mode', () => {
    const items: any[] = [{ id: 'orphan', extra: {} }];
    expect(buildGoalBuckets(items as any, goals, { includeUnassigned: true }).some((bucket) => bucket.name === UNASSIGNED_GOAL_KEY)).toBe(true);
    expect(buildGoalBuckets(items as any, goals, { includeUnassigned: false }).some((bucket) => bucket.name === UNASSIGNED_GOAL_KEY)).toBe(false);
  });
});
