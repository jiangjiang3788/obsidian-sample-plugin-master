import { buildGoalBuckets, getItemGoalKey, UNASSIGNED_GOAL_KEY } from '../../src/core/goal';

const goals = [
  { path: '项目/目标A' },
];

describe('item goal grouping', () => {
  it('uses the canonical Goal path directly', () => {
    expect(getItemGoalKey({ goalPath: '项目/目标B', extra: {} } as never, goals)).toBe('项目/目标B');
    expect(getItemGoalKey({ extra: {} } as never, goals)).toBe(UNASSIGNED_GOAL_KEY);
  });

  it('adds unassigned bucket only when requested', () => {
    const items = [{ id: 'orphan', extra: {} }];
    expect(buildGoalBuckets(items as never, goals, { includeUnassigned: true }).some((bucket) => bucket.name === UNASSIGNED_GOAL_KEY)).toBe(true);
    expect(buildGoalBuckets(items as never, goals, { includeUnassigned: false }).some((bucket) => bucket.name === UNASSIGNED_GOAL_KEY)).toBe(false);
  });
});
