import { readField } from '@/core/fields/ViewFieldCatalog';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import { buildParsedRecordSnapshot } from '@/core/types/recordSnapshot';

function makeItem(overrides: Partial<RecordViewItem>): RecordViewItem {
  return {
    id: 'rec.01J00000000000000000000062',
    title: '任务',
    content: '任务',
    tags: [],
    coreBlock: 'task',
  status: 'open',
  categoryKey: '任务',
    created: 1,
    modified: 2,
    extra: {},
    ...overrides,
  };
}

describe('theme semantics', () => {
  it('readField does not derive theme fields from header', () => {
    const item = makeItem({ header: '学习/英语' });

    expect(readField(item, 'themePath')).toBeUndefined();
    expect(readField(item, 'rootTheme')).toBeUndefined();
    expect(readField(item, 'leafTheme')).toBeUndefined();
  });

  it('snapshot does not derive theme fields from header', () => {
    const snapshot = buildParsedRecordSnapshot(makeItem({ header: '学习/英语' }));

    expect(snapshot.semantic.themePath).toBeNull();
    expect(snapshot.semantic.rootTheme).toBeNull();
    expect(snapshot.semantic.leafTheme).toBeNull();
  });

  it('explicit theme still derives theme path parts', () => {
    const item = makeItem({ theme: '学习/英语/听力', header: '不应该参与主题推导' });
    const snapshot = buildParsedRecordSnapshot(item);

    expect(readField(item, 'themePath')).toBe('学习/英语/听力');
    expect(readField(item, 'rootTheme')).toBe('学习');
    expect(readField(item, 'leafTheme')).toBe('听力');
    expect(snapshot.semantic.themePath).toBe('学习/英语/听力');
    expect(snapshot.semantic.rootTheme).toBe('学习');
    expect(snapshot.semantic.leafTheme).toBe('听力');
  });
});
