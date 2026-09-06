/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F056/unit
 * @covers F126/regression
 */
import { buildRepeatedTaskFormData } from '@core/records/public';

describe('历史 Task 再次执行草稿', () => {
  it('保留任务意图和分类，但清除历史、计划与周期身份', () => {
    const repeated = buildRepeatedTaskFormData({
      id: 'task.old',
      recordId: 'task.old',
      status: 'done',
      content: '八段锦',
      goalPath: '照顾好自己/运动',
      brainDemand: 'low',
      physicalDemand: 'medium',
      priority: 'medium',
      availabilityContexts: ['home'],
      expectedDurationMinutes: 30,
      customNote: '保留这个用户字段',
      completedAt: '2026-08-28T20:00:00',
      startAt: '2026-08-28T19:30:00',
      endAt: '2026-08-28T20:00:00',
      scheduledAt: '2026-08-28T19:30:00',
      dueDate: '2026-08-28',
      seriesId: 'taskseries.old',
      recurrenceUnit: 'day',
      recurrenceInterval: 1,
    });

    expect(repeated).toMatchObject({
      status: 'open',
      content: '八段锦',
      goalPath: '照顾好自己/运动',
      brainDemand: 'low',
      physicalDemand: 'medium',
      priority: 'medium',
      availabilityContexts: ['home'],
      expectedDurationMinutes: 30,
      customNote: '保留这个用户字段',
    });
    for (const key of [
      'id', 'recordId', 'completedAt', 'startAt', 'endAt', 'scheduledAt', 'dueDate',
      'seriesId', 'recurrenceUnit', 'recurrenceInterval',
    ]) {
      expect(repeated).not.toHaveProperty(key);
    }
  });
});
