import { parseTaskLine, parseBlockContent } from '@/core/utils/parser';
import { getAllFields, readField, type Item } from '@/core/types/schema';
import { getAvailableFieldsByCategory, getFieldLabel } from '@/core/types/fields';

function makeBaseItem(overrides: Partial<Item>): Item {
  return {
    id: 'file.md#1',
    title: '测试',
    content: '测试',
    type: 'task',
    tags: [],
    recurrence: 'none',
    categoryKey: '未完成任务',
    created: 1,
    modified: 2,
    extra: {},
    ...overrides,
  };
}

describe('field semantics and provenance', () => {
  it('task body is not written into extra aliases', () => {
    const item = parseTaskLine('daily.md', '- [ ] 写代码 #dev (地点::办公室)', 3, 'root')!;

    expect(item.editableText).toBe('写代码');
    expect(item.extra['地点']).toBe('办公室');
    expect(item.extra['正文']).toBeUndefined();
    expect(item.extra['内容']).toBeUndefined();
    expect(item.extra['任务内容']).toBeUndefined();
    expect(item.extra['记录内容']).toBeUndefined();
    expect(item.extra['editableText']).toBeUndefined();
    expect(item.fieldOrigins?.['extra.地点']?.[0]?.kind).toBe('markdown_task_kv');
  });

  it('legacy polluted body extra aliases are hidden from field picker unless explicitly parsed', () => {
    const polluted = makeBaseItem({ extra: { 正文: '旧 parser 污染', 内容: '旧 parser 污染' } });
    const explicit = parseTaskLine('daily.md', '- [ ] 测试 (正文::用户显式字段)', 4, 'root')!;

    expect(getAllFields([polluted])).not.toContain('extra.正文');
    expect(getAllFields([explicit])).toContain('extra.正文');
    expect(readField(explicit, 'extra.正文')).toBe('用户显式字段');
  });

  it('common field picker exposes themePath instead of legacy theme', () => {
    const fields = getAllFields([]);

    expect(fields).toContain('themePath');
    expect(fields).not.toContain('theme');
    expect(getFieldLabel('themePath')).toBe('主题路径');
    expect(getFieldLabel('theme')).toBe('旧主题字段');
  });

  it('field registry can group fields into core/file/semantic/derived/extra', () => {
    const item = parseBlockContent('blocks.md', ['[!thinktxt]', '地点:: 家', '内容:: 记录'], 0, 3, 'root')!;
    const grouped = getAvailableFieldsByCategory([item]);

    expect(grouped.core.map(f => f.key)).toContain('title');
    expect(grouped.file.map(f => f.key)).toContain('file.path');
    expect(grouped.semantic.map(f => f.key)).toContain('themePath');
    expect(grouped.extra.map(f => f.key)).toContain('extra.地点');
  });
});
