import { normalizeTemplateRenderData } from '@/core/fields/public';

describe('core input fields in templates', () => {
  it('keeps 分类 / 主题 / 标签 as form fields and exposes canonical render variables', () => {
    const template = {
      fields: [
        { id: 'category', key: '分类', label: '分类', type: 'path' },
        { id: 'theme', key: '主题', label: '主题', type: 'path' },
        { id: 'tags', key: '标签', label: '标签', type: 'multiTag' },
      ],
    } as any;

    const data = normalizeTemplateRenderData(template, {
      分类: '闪念/感受',
      主题: '生活/健康',
      标签: '项目/插件, 地点/家',
    });

    expect(data.分类).toMatchObject({ value: '闪念/感受' });
    expect(data.categoryKey).toBe('闪念/感受');
    expect(data.baseCategory).toBe('闪念');
    expect(data.leafCategory).toBe('感受');

    expect(data.主题).toMatchObject({ value: '生活/健康' });
    expect(data.themePath).toBe('生活/健康');
    expect(data.rootTheme).toBe('生活');
    expect(data.leafTheme).toBe('健康');

    expect(data.tags).toEqual(['项目/插件', '地点/家']);
  });
});
