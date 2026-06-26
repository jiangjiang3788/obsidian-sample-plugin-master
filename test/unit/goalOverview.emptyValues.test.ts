import { buildGoalOverviewModel } from '@/core/goal/overview';

describe('buildGoalOverviewModel empty value hardening', () => {
  it('skips empty goal path records without throwing', () => {
    const model = buildGoalOverviewModel({
      goals: [],
      items: [
        { id: 'a', title: 'empty goal', content: 'x', goalPaths: [undefined], date: '2026-06-06' } as any,
        { id: 'b', title: 'valid goal', content: 'x', goalPaths: ['产品/目标'], date: '2026-06-06' } as any,
      ],
    });
    expect(model.rows.length).toBe(1);
    expect(model.rows[0].goalPath).toBe('产品/目标');
  });
});
