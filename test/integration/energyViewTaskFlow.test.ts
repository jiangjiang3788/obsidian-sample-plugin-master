/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F064/integration
 */
import type { GoalDefinition } from '@core/goal/public';
import type { RecordViewItem } from '@core/types/public';
import { buildEnergyViewModel } from '@/features/views/models/energyViewModel';

function base(overrides: Partial<RecordViewItem>): RecordViewItem {
  return { id: 'x', title: '', content: '', tags: [], categoryKey: '', created: 0, modified: 0, extra: {}, ...overrides } as RecordViewItem;
}

describe('精力视图到任务推荐的组合链路', () => {
  it('最新精力与任务需求在同一视图模型中生成可开始的推荐任务和建议时长', () => {
    const goalPath = '工作/Think OS';
    const energy = base({
      id: 'energy-v6', coreBlock: 'energy', categoryKey: '精力', goalPath,
      date: '2026-08-24', startTime: '08:30',
      extra: { 记录类型: 'energy', 精力值: 85, 脑力值: 90, 体力值: 70, 日期: '2026-08-24', 时间: '08:30', 评分模式: 'quick', 记录方式: 'realtime' },
    });
    const task = base({
      id: 'task-v6', coreBlock: 'task', categoryKey: '任务', goalPath, status: 'open',
      title: '完成 V6 测试体系', content: '完成 V6 测试体系',
      brainDemand: 'medium', physicalDemand: 'low', expectedDurationMinutes: 35, availabilityContexts: ['work'],
    });
    const goals = [{ path: goalPath, status: 'active', createdAt: '', updatedAt: '' }] as GoalDefinition[];
    const model = buildEnergyViewModel({
      items: [energy, task],
      records: [energy, task],
      module: { id: 'energy-view-v6', title: '精力', viewType: 'EnergyView', viewConfig: { currentContext: 'work' } },
      goals,
      timers: [],
      currentView: '天',
      dateRange: [new Date('2026-08-24T00:00:00'), new Date('2026-08-24T23:59:59')],
    });

    expect(model.taskList.latestEnergy?.score).toBe(85);
    expect(model.taskList.recommendations.map((row) => row.itemId)).toContain('task-v6');
    expect(model.taskList.recommendations.find((row) => row.itemId === 'task-v6')).toMatchObject({
      suggestedDurationMinutes: 35,
      goalPath,
    });
  });
});
