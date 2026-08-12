import {
  getTemplateFieldSemantic,
  isTemplateImageField,
  isTemplateMultiValueField,
  normalizeTemplateFieldValue,
  normalizeTemplateRenderData,
} from '../../src/core/fields/TemplateFieldAdapter';
import type { RecordCaptureTemplate, TemplateField } from '../../src/core/recordInput/CaptureTemplate';

describe('TemplateFieldAdapter', () => {
  it('识别显式语义，不依赖固定字段名', () => {
    expect(getTemplateFieldSemantic({ key: 'my_topic', label: '任意名称', type: 'path', semantic: 'themePath' })).toBe('themePath');
    expect(getTemplateFieldSemantic({ key: 'labels', label: '随便叫', type: 'multiTag', semantic: 'tags' })).toBe('tags');
  });

  it('兼容旧中文字段名，但归一化到语义', () => {
    expect(getTemplateFieldSemantic({ key: '主题', label: '主题', type: 'select' })).toBe('themePath');
    expect(getTemplateFieldSemantic({ key: '评图', label: '评图', type: 'text' })).toBe('image');
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
      fields: [{ id: 'score', key: 'score', label: '评分', type: 'rating', semanticType: 'ratingPair', auxKey: 'pintu' }],
    } satisfies Pick<RecordCaptureTemplate, 'fields'>;
    const data = normalizeTemplateRenderData(template, {
      score: { label: '不错', value: 'icons/good.png' },
    });
    expect(data.score).toEqual({ label: '不错', value: 'icons/good.png' });
    expect(data.pintu).toBe('icons/good.png');
  });

  it('识别多值字段', () => {
    expect(isTemplateMultiValueField({ key: 'tags', type: 'multiTag' })).toBe(true);
    expect(isTemplateMultiValueField({ key: 'theme', type: 'path' })).toBe(false);
  });
});
