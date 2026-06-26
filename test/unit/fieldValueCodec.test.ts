import {
  decodeMarkdownFieldValue,
  decodeUnknownMarkdownKvValue,
  encodeFieldValueForMarkdown,
  FIELD_CODEC_PRESETS,
  formatFieldValueForTemplate,
} from '../../src/core/records/codec/FieldValueCodec';

describe('FieldValueCodec', () => {
  it('解码多标签和层级路径', () => {
    expect(decodeMarkdownFieldValue('#项目/插件, 地点/家', FIELD_CODEC_PRESETS.tags)).toEqual(['项目/插件', '地点/家']);
    expect(decodeMarkdownFieldValue('生活 / 健康 / 睡眠', FIELD_CODEC_PRESETS.themePath)).toBe('生活/健康/睡眠');
  });

  it('解码图片字段并写回稳定路径', () => {
    const image = decodeMarkdownFieldValue('![[assets/a.png]]', FIELD_CODEC_PRESETS.image) as any;
    expect(image.src).toBe('assets/a.png');
    expect(encodeFieldValueForMarkdown(image, FIELD_CODEC_PRESETS.image)).toBe('assets/a.png');
  });

  it('模板渲染不会输出 object 字符串', () => {
    expect(formatFieldValueForTemplate([{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }])).toBe('a, b');
    expect(formatFieldValueForTemplate({ src: 'cover.png' }, FIELD_CODEC_PRESETS.image)).toBe('cover.png');
  });

  it('未知 KV 只做基础标量解码', () => {
    expect(decodeUnknownMarkdownKvValue('true')).toBe(true);
    expect(decodeUnknownMarkdownKvValue('42')).toBe(42);
    expect(decodeUnknownMarkdownKvValue('项目/插件')).toBe('项目/插件');
  });
});
