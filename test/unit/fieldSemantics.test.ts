import { parseTaskLine, parseBlockContent } from '@/core/utils/parser';
import { getAllFields, readField, type Item } from '@/core/types/schema';
import { filterByKeyword, filterByRules } from '@/core/utils/itemFilter';
import { normalizeRecordItem } from '@/core/records/RecordNormalizer';
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

describe('field semantics', () => {
  it('task body is not written into extra aliases', () => {
    const item = parseTaskLine('daily.md', '- [ ] 写代码 #dev (地点::办公室)', 3, 'root')!;

    expect(item.editableText).toBe('写代码');
    expect(item.extra['地点']).toBe('办公室');
    expect(item.extra['正文']).toBeUndefined();
    expect(item.extra['内容']).toBeUndefined();
    expect(item.extra['任务内容']).toBeUndefined();
    expect(item.extra['记录内容']).toBeUndefined();
    expect(item.extra['editableText']).toBeUndefined();
  });

  it('legacy polluted body extra aliases are always hidden from field picker', () => {
    const polluted = makeBaseItem({ extra: { 正文: '旧 parser 污染', 内容: '旧 parser 污染' } });
    const explicit = parseTaskLine('daily.md', '- [ ] 测试 (正文::用户显式字段)', 4, 'root')!;

    expect(getAllFields([polluted])).not.toContain('extra.正文');
    expect(getAllFields([explicit])).not.toContain('extra.正文');
    expect(readField(explicit, 'extra.正文')).toBe('用户显式字段');
  });



  it('fullData aliases resolve to original raw source while content stays clean', () => {
    const item = parseTaskLine('daily.md', '- [ ] 🧠 写插件计划 #dev (时间::09:00)', 8, 'root')!;

    expect(item.content).toBe('写插件计划');
    expect(readField(item, '内容')).toBe('写插件计划');
    expect(readField(item, '完整数据')).toBe('- [ ] 🧠 写插件计划 #dev (时间::09:00)');
    expect(readField(item, 'rawSource')).toBe('- [ ] 🧠 写插件计划 #dev (时间::09:00)');
  });

  it('record normalizer repairs old task content that still contains a raw task line', () => {
    const item = normalizeRecordItem(makeBaseItem({
      content: '- [ ] 🧠 兼容旧缓存 #dev (时间::09:00) 🔁 every week',
      rawSource: '- [ ] 🧠 兼容旧缓存 #dev (时间::09:00) 🔁 every week',
      title: '- [ ] 🧠 兼容旧缓存 #dev (时间::09:00) 🔁 every week',
    }), {
      created: 1,
      modified: 2,
      filePath: 'daily.md',
      fileName: 'daily.md',
      parentFolder: 'root',
    } as any);

    expect(item.content).toBe('兼容旧缓存');
    expect(item.editableText).toBe('兼容旧缓存');
    expect(item.title).toBe('兼容旧缓存');
    expect(item.fullData).toBe('- [ ] 🧠 兼容旧缓存 #dev (时间::09:00) 🔁 every week');
  });

  it('filters can target 完整数据 without confusing it with clean content', () => {
    const item = parseTaskLine('daily.md', '- [ ] 写代码 #dev (时间::09:00)', 9, 'root')!;
    const normalized = normalizeRecordItem(item, {
      created: 1,
      modified: 2,
      filePath: 'daily.md',
      fileName: 'daily.md',
      parentFolder: 'root',
    } as any);

    expect(filterByRules([normalized], [{ field: 'content', op: 'includes', value: '09:00' }])).toHaveLength(0);
    expect(filterByRules([normalized], [{ field: '完整数据', op: 'includes', value: '09:00' }])).toHaveLength(1);
    expect(filterByKeyword([normalized], '09:00')).toHaveLength(1);
  });

  it('common field picker exposes themePath instead of legacy theme', () => {
    const fields = getAllFields([]);

    expect(fields).toContain('themePath');
    expect(fields).not.toContain('theme');
    expect(getFieldLabel('themePath')).toBe('主题路径');
    expect(getFieldLabel('theme')).toBe('主题路径');
  });

  it('field registry can group fields into core/file/custom', () => {
    const item = parseBlockContent('blocks.md', ['<!-- start -->', '地点:: 家', '内容:: 记录', '<!-- end -->'], 0, 3, 'root')!;
    const grouped = getAvailableFieldsByCategory([item]);

    expect(grouped.core.map(f => f.key)).toContain('title');
    expect(grouped.file.map(f => f.key)).toContain('file.path');
    expect(grouped.core.map(f => f.key)).toContain('themePath');
    expect(grouped.custom.map(f => f.key)).toContain('extra.地点');
    expect((grouped as any).semantic).toBeUndefined();
    expect((grouped as any).derived).toBeUndefined();
  });
});
