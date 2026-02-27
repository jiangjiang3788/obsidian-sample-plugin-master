import { parseBlockContent } from '@/core/utils/parser';

describe('legacy block supports callout quote format', () => {
  it('parses KV lines inside quoted callout block', () => {
    const lines = [
      '<!-- start -->',
      '> [!thinktxt]',
      '> 分类:: 打卡',
      '> 日期:: 2025-05-12',
      '> 主题:: 思考/读书',
      '> 评分:: 1',
      '> 内容:: 余华文学课',
      '<!-- end -->',
    ];

    const item = parseBlockContent('a.md', lines, 0, lines.length - 1, '');
    expect(item).not.toBeNull();
    expect(item!.type).toBe('block');
    expect(item!.categoryKey).toBe('打卡');
    expect((item as any).theme).toBe('思考/读书');
    expect(item!.date).toBe('2025-05-12');
    expect((item as any).rating).toBe(1);
    expect(item!.content).toContain('余华文学课');
  });

  it('preserves task list lines inside quoted callout block', () => {
    const lines = [
      '<!-- start -->',
      '> [!thinktxt]',
      '>- [x] ✨✨没精神  (主题::生活) (时间::15:00) (时长::180) ✅ 2025-08-08',
      '>- [x] ✨✨回家  (主题::生活) (时间::12:00) (时长::20) ✅ 2025-08-08',
      '<!-- end -->',
    ];
    const item = parseBlockContent('b.md', lines, 0, lines.length - 1, '');
    expect(item).not.toBeNull();
    // no KV '内容::', so content mode should capture raw task lines
    expect(item!.content).toContain('- [x]');
    expect(item!.content).toContain('没精神');
    expect(item!.content).toContain('回家');
  });
});
