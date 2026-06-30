import { getCategoryValuesFromFilters } from '@core/public';

describe('layoutFilterAdapter', () => {
  test('可以从 layout filters 中提取明确分类值，供统计视图收窄类别配置', () => {
    expect(getCategoryValuesFromFilters([
      { field: 'baseCategory', op: 'in', value: ['任务', '习惯'] },
      { field: 'title', op: 'includes', value: '设计' },
    ])).toEqual(['任务', '习惯']);
  });
});
