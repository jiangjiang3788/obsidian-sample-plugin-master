/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F057/integration
 * @covers F057/regression
 * @covers F063/integration
 */
import {
  buildEnergyActionCandidates,
  buildEnergyActionRecommendations,
} from '@core/energy/public';
import type { RecordViewItem } from '@core/types/public';

function task(id: string, title: string, overrides: Partial<RecordViewItem> = {}): RecordViewItem {
  return {
    id,
    title,
    content: title,
    tags: [],
    created: 0,
    modified: 0,
    recordType: 'task',
    status: 'open',
    extra: {},
    ...overrides,
  } as RecordViewItem;
}

describe('任务需求到精力推荐的组合链路', () => {
  it('候选层读取 canonical 脑力/体力/场景，推荐层据此选择当前可执行任务', () => {
    const candidates = buildEnergyActionCandidates([
      task('deep', '深度设计', {
        brainDemand: 'high', physicalDemand: 'low', expectedDurationMinutes: 60,
        availabilityContexts: ['work'], priority: 'highest',
      }),
      task('home', '整理房间', {
        brainDemand: 'low', physicalDemand: 'medium', expectedDurationMinutes: 30,
        availabilityContexts: ['home'],
      }),
    ], { today: '2026-08-24', currentContext: 'work' });

    expect(candidates.map((row) => row.id)).toEqual(['deep']);
    expect(candidates[0]).toMatchObject({ brainLoad: 'high', physicalLoad: 'low' });

    const recommendation = buildEnergyActionRecommendations({
      score: 85,
      brainScore: 90,
      physicalScore: 65,
    }, candidates);
    expect(recommendation.recommendations[0].candidate.id).toBe('deep');
  });

  it('历史 extra 中的旧需求字段不能覆盖 canonical Task 字段', () => {
    const [candidate] = buildEnergyActionCandidates([
      task('canonical', '短任务', {
        brainDemand: 'low',
        physicalDemand: 'medium',
        expectedDurationMinutes: 5,
        extra: { 脑力要求: 'high', 体力要求: 'high', 场景: 'home' },
      }),
    ], { today: '2026-08-24', currentContext: 'work' });

    expect(candidate).toMatchObject({
      id: 'canonical', brainLoad: 'low', physicalLoad: 'medium', durationMinutes: 5,
    });
  });
});
