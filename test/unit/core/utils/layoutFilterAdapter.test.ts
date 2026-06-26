import {
  describeLegacyLayoutFilters,
  getEffectiveLayoutFilters,
  getCategoryValuesFromFilters,
  getLegacyLayoutFilterState,
  migrateLegacyLayoutFilters,
} from '@core/public';
import type { Layout } from '@core/public';

function layout(partial: Partial<Layout>): Layout {
  return {
    id: 'layout-1',
    parentId: null,
    name: '测试布局',
    viewInstanceIds: [],
    ...partial,
  } as Layout;
}

describe('layoutFilterAdapter', () => {
  test('globalFilters 显式存在时优先，即使为空数组也不回退 legacy 字段', () => {
    const filters = getEffectiveLayoutFilters(layout({
      globalFilters: [],
      selectedThemes: ['工作/项目A'],
      selectedCategories: ['任务'],
    }));

    expect(filters).toEqual([]);
  });

  test('旧布局没有 globalFilters 时，把主题和分类适配为 FilterRule', () => {
    const filters = getEffectiveLayoutFilters(layout({
      selectedThemes: ['工作/项目A'],
      selectedCategories: ['任务'],
    }));

    expect(filters).toEqual([
      { field: 'themePath', op: 'in', value: ['工作/项目A'], logic: 'and' },
      { field: 'baseCategory', op: 'in', value: ['任务'] },
    ]);
  });

  test('可以识别旧字段兼容状态，用于 UI 提示用户迁移', () => {
    const state = getLegacyLayoutFilterState(layout({
      selectedThemes: ['工作/项目A'],
      selectedCategories: ['任务'],
    }));

    expect(state.isLegacyMode).toBe(true);
    expect(state.hasLegacyValues).toBe(true);
    expect(state.effectiveFilters).toHaveLength(2);
    expect(describeLegacyLayoutFilters(state)).toBe('主题 1 项，分类 1 项');
  });

  test('迁移旧字段时写入 globalFilters 并清空 selectedThemes / selectedCategories', () => {
    expect(migrateLegacyLayoutFilters(layout({
      selectedThemes: ['工作/项目A'],
      selectedCategories: ['任务'],
    }))).toEqual({
      globalFilters: [
        { field: 'themePath', op: 'in', value: ['工作/项目A'], logic: 'and' },
        { field: 'baseCategory', op: 'in', value: ['任务'] },
      ],
      selectedThemes: [],
      selectedCategories: [],
    });
  });

  test('可以从 layout filters 中提取明确分类值，供统计视图收窄类别配置', () => {
    expect(getCategoryValuesFromFilters([
      { field: 'baseCategory', op: 'in', value: ['任务', '习惯'] },
      { field: 'title', op: 'includes', value: '设计' },
    ])).toEqual(['任务', '习惯']);
  });
});
