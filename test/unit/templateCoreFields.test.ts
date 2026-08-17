import { normalizeTemplateRenderData } from '@/core/fields/public';

describe('core input fields in templates', () => {
  it('keeps 分类 / 目标 / 标签 as canonical form fields', () => {
    const template = { fields: [
      { id: 'category', key: '分类', label: '分类', type: 'path' },
      { id: 'goal', key: '目标', label: '目标', type: 'hierarchicalSingleSelect' },
      { id: 'tags', key: '标签', label: '标签', type: 'multiTag' },
    ] } as any;
    const data = normalizeTemplateRenderData(template, { 分类: '闪念/感受', 目标: '照顾好自己/睡眠', 标签: '项目/插件, 地点/家' });
    expect(data.分类).toMatchObject({ value: '闪念/感受' });
    expect(data.categoryKey).toBe('闪念/感受');
    expect(data.baseCategory).toBe('闪念');
    expect(data.leafCategory).toBe('感受');
    expect(data.目标).toMatchObject({ value: '照顾好自己/睡眠' });
    expect(data.goalPath).toBe('照顾好自己/睡眠');
    expect(data.rootGoal).toBe('照顾好自己');
    expect(data.leafGoal).toBe('睡眠');
    expect(data.tags).toEqual(['项目/插件', '地点/家']);
  });
});
