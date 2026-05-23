import {
  getTemplateFieldSemantic,
  isTemplateImageField,
  isTemplateMultiValueField,
  normalizeTemplateFieldValue,
  normalizeTemplateRenderData,
} from '../../src/core/fields/TemplateFieldAdapter';

describe('TemplateFieldAdapter', () => {
  it('识别显式语义，不依赖固定字段名', () => {
    expect(getTemplateFieldSemantic({ key: 'my_topic', label: '任意名称', type: 'path' as any, semantic: 'themePath' as any })).toBe('themePath');
    expect(getTemplateFieldSemantic({ key: 'labels', label: '随便叫', type: 'multiTag' as any, semantic: 'tags' as any })).toBe('tags');
  });

  it('兼容旧中文字段名，但归一化到语义', () => {
    expect(getTemplateFieldSemantic({ key: '主题', label: '主题', type: 'select' as any })).toBe('themePath');
    expect(getTemplateFieldSemantic({ key: '评图', label: '评图', type: 'text' as any })).toBe('image');
  });

  it('归一化多标签和多路径字段', () => {
    const tags = normalizeTemplateFieldValue({ key: 'x', type: 'multiTag' as any, semantic: 'tags' as any }, '#项目/插件, 地点/家');
    expect(tags).toEqual(['项目/插件', '地点/家']);

    const paths = normalizeTemplateFieldValue({ key: 'x', type: 'multiPath' as any }, '生活/健康\n工作/插件');
    expect(paths).toEqual(['生活/健康', '工作/插件']);
  });

  it('支持图片字段和 ratingPair 辅助输出', () => {
    const imageField = { key: 'cover', label: '封面', type: 'image' as any, semantic: 'image' as any };
    expect(isTemplateImageField(imageField)).toBe(true);
    expect(normalizeTemplateFieldValue(imageField, '![[a.png]]')).toBe('a.png');

    const data = normalizeTemplateRenderData({ fields: [{ key: 'score', label: '评分', type: 'rating' as any, semanticType: 'ratingPair' as any, auxKey: 'pintu' }] } as any, {
      score: { label: '不错', value: 'icons/good.png' },
    });
    expect(data.score).toEqual({ label: '不错', value: 'icons/good.png' });
    expect(data.pintu).toBe('icons/good.png');
  });

  it('识别多值字段', () => {
    expect(isTemplateMultiValueField({ key: 'tags', type: 'multiTag' as any })).toBe(true);
    expect(isTemplateMultiValueField({ key: 'theme', type: 'path' as any })).toBe(false);
  });
});
