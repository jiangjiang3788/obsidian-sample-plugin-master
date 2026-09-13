/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F026/unit
 */
import { normalizeTemplateRenderData } from '@/core/fields/public';

describe('core input fields in templates', () => {
  it('keeps Goal and Tags as canonical form fields without a Category projection', () => {
    const template = { fields: [
      { id: 'goal', key: '目标', label: '目标', type: 'hierarchicalSingleSelect' },
      { id: 'tags', key: '标签', label: '标签', type: 'multiTag' },
    ] } as any;
    const data = normalizeTemplateRenderData(template, { 目标: '照顾好自己/睡眠', 标签: '项目/插件, 地点/家' });
    expect(data.目标).toMatchObject({ value: '照顾好自己/睡眠' });
    expect(data.goalPath).toBe('照顾好自己/睡眠');
    expect(data.rootGoal).toBe('照顾好自己');
    expect(data.leafGoal).toBe('睡眠');
    expect(data.tags).toEqual(['项目/插件', '地点/家']);
    expect(data).not.toHaveProperty('categoryKey');
  });
});
