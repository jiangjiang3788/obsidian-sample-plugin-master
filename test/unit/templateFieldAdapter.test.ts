import {
  getTemplateFieldSemantic,
  isTemplateImageField,
  isTemplateMultiValueField,
  normalizeTemplateFieldValue,
  normalizeTemplateRenderData,
} from '../../src/core/fields/TemplateFieldAdapter';
import type { RecordCaptureTemplate, TemplateField } from '../../src/core/recordInput/CaptureTemplate';

describe('TemplateFieldAdapter', () => {
  it('recognizes explicit current semantics without fixed field names', () => {
    expect(getTemplateFieldSemantic({ key: 'my_goal', label: '任意名称', type: 'path', semantic: 'goalPath' })).toBe('goalPath');
    expect(getTemplateFieldSemantic({ key: 'my_category', label: '任意分类', type: 'path', semantic: 'categoryPath' })).toBe('categoryPath');
    expect(getTemplateFieldSemantic({ key: 'labels', label: '随便叫', type: 'multiTag', semantic: 'tags' })).toBe('tags');
  });

  it('recognizes current Chinese core field names', () => {
    expect(getTemplateFieldSemantic({ key: '分类', label: '分类', type: 'hierarchicalSingleSelect' })).toBe('categoryPath');
    expect(getTemplateFieldSemantic({ key: '目标', label: '目标', type: 'hierarchicalSingleSelect' })).toBe('goalPath');
    expect(getTemplateFieldSemantic({ key: '图片', label: '图片', type: 'image' })).toBe('image');
  });

  it('归一化多标签和多路径字段', () => {
    const tags = normalizeTemplateFieldValue({ key: 'x', type: 'multiTag', semantic: 'tags' }, '#项目/插件, 地点/家');
    expect(tags).toEqual(['项目/插件', '地点/家']);
    const paths = normalizeTemplateFieldValue({ key: 'x', type: 'multiPath' }, '生活/健康\n工作/插件');
    expect(paths).toEqual(['生活/健康', '工作/插件']);
  });

  it('支持图片字段和 ratingPair 辅助输出', () => {
    const imageField = { key: 'cover', label: '封面', type: 'image', semantic: 'image' } satisfies Partial<TemplateField>;
    expect(isTemplateImageField(imageField)).toBe(true);
    expect(normalizeTemplateFieldValue(imageField, '![[a.png]]')).toBe('a.png');
    const template = {
      fields: [{ id: 'score', key: 'score', label: '评分', type: 'rating', semanticType: 'ratingPair', auxKey: 'image' }],
    } satisfies Pick<RecordCaptureTemplate, 'fields'>;
    const data = normalizeTemplateRenderData(template, { score: { label: '不错', value: 'icons/good.png' } });
    expect(data.score).toEqual({ label: '不错', value: 'icons/good.png' });
    expect(data.image).toBe('icons/good.png');
  });

  it('识别多值字段', () => {
    expect(isTemplateMultiValueField({ key: 'tags', type: 'multiTag' })).toBe(true);
    expect(isTemplateMultiValueField({ key: 'goal', type: 'path' })).toBe(false);
  });
});
