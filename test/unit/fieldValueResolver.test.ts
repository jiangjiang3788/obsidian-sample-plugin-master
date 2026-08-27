/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F013/unit
 */
import { resolveFieldValue, readFieldValue, normalizeFieldKey } from '@/core/fields/public';
import type { RecordViewItem } from '@/core/records/RecordEntity';

function makeItem(overrides: Partial<RecordViewItem> = {}): RecordViewItem {
  return {
    id: 'rec.01J00000000000000000000061',
    coreBlock: 'thought',
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
  it('resolves current UI labels through canonical field keys', () => {
    const item = makeItem({ startAt: '2026-08-15T09:30', file: { path: 'daily/note.md', basename: 'note', folder: 'daily' } });

    expect(normalizeFieldKey('开始时间')).toBe('startAt');
    expect(readFieldValue(item, '开始时间')).toBe('2026-08-15T09:30');
    expect(readFieldValue(item, '文件名')).toBe('note');
  });

  it('resolves Goal hierarchy through goalPath only', () => {
    const item = makeItem({ goalPath: '学习/英语/听力', header: '工作/错误标题' });
    expect(readFieldValue(item, 'goalPath')).toBe('学习/英语/听力');
    expect(readFieldValue(item, 'rootGoal')).toBe('学习');
    expect(readFieldValue(item, 'leafGoal')).toBe('听力');
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

  it('resolves the canonical image field', () => {
    const item = makeItem({ image: 'attachments/a.png' });
    const image = readFieldValue(item, '图片') as { src: string } | undefined;

    expect(normalizeFieldKey('图片')).toBe('image');
    expect(image?.src).toBe('attachments/a.png');
  });
});
