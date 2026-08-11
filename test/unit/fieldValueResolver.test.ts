import { resolveFieldValue, readFieldValue, normalizeFieldKey } from '@/core/fields';
import type { Item } from '@/core/types/schema';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'rec.01J00000000000000000000061',
    title: '标题',
    content: '内容',
    tags: [],
    categoryKey: '项目/插件',
    created: 1,
    modified: 2,
    extra: {},
    ...overrides,
  };
}

describe('FieldValueResolver', () => {
  it('keeps readField compatibility while resolving through canonical field keys', () => {
    const item = makeItem({ startTime: '09:30', file: { path: 'daily/note.md', basename: 'note', folder: 'daily' } });

    expect(normalizeFieldKey('开始时间')).toBe('startTime');
    expect(readFieldValue(item, '开始时间')).toBe('09:30');
    expect(readFieldValue(item, '文件名')).toBe('note');
    expect(readFieldValue(item, 'filename')).toBe('note');
  });

  it('resolves themePath/rootTheme/leafTheme from explicit theme only, never from header', () => {
    const withHeaderOnly = makeItem({ header: '工作/错误标题' });
    const withExplicitTheme = makeItem({ header: '工作/错误标题', theme: '学习/英语/听力' });

    expect(readFieldValue(withHeaderOnly, 'themePath')).toBeUndefined();
    expect(readFieldValue(withHeaderOnly, '主题')).toBeUndefined();
    expect(readFieldValue(withExplicitTheme, '主题')).toBe('学习/英语/听力');
    expect(readFieldValue(withExplicitTheme, 'rootTheme')).toBe('学习');
    expect(readFieldValue(withExplicitTheme, 'leafTheme')).toBe('听力');
  });

  it('returns resolution metadata for field source and derived state', () => {
    const item = makeItem({ extra: { 地点: '办公室' } });

    const extra = resolveFieldValue(item, 'extra.地点');
    expect(extra.value).toBe('办公室');
    expect(extra.source).toBe('extra');

    const base = resolveFieldValue(item, '根分类');
    expect(base.field).toBe('baseCategory');
    expect(base.value).toBe('项目');
    expect(base.derived).toBe(true);
  });

  it('supports semantic image alias without exposing pintu as the default field', () => {
    const item = makeItem({ pintu: 'attachments/a.png' });
    const image = readFieldValue(item, '图片') as { src: string } | undefined;

    expect(normalizeFieldKey('图片')).toBe('image');
    expect(image?.src).toBe('attachments/a.png');
  });
});
