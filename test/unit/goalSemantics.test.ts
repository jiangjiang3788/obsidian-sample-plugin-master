/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F030/regression
 * @covers F030/unit
 * @covers F033/unit
 */
import { readField } from '@/core/fields/ViewFieldCatalog';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import { buildParsedRecordSnapshot } from '@/core/types/recordSnapshot';

function makeItem(overrides: Partial<RecordViewItem>): RecordViewItem {
  return { id: 'rec.01J00000000000000000000062', title: '任务', content: '任务', tags: [], recordType: 'task', status: 'open', created: 1, modified: 2, extra: {}, ...overrides } as RecordViewItem;
}

describe('Goal semantics', () => {
  it('does not derive Goal from the Markdown heading', () => {
    const item = makeItem({ header: '学习/英语' });
    expect(readField(item, 'goalPath')).toBeUndefined();
    expect(readField(item, 'rootGoal')).toBeUndefined();
    expect(readField(item, 'leafGoal')).toBeUndefined();
    expect(buildParsedRecordSnapshot(item).semantic.goalPath).toBeNull();
  });

  it('derives root and leaf Goal from the one explicit Goal path', () => {
    const item = makeItem({ goalPath: '学习/英语/听力', header: '文件章节' });
    const snapshot = buildParsedRecordSnapshot(item);
    expect(readField(item, 'goalPath')).toBe('学习/英语/听力');
    expect(readField(item, 'rootGoal')).toBe('学习');
    expect(readField(item, 'leafGoal')).toBe('听力');
    expect(snapshot.semantic.goalPath).toBe('学习/英语/听力');
  });
});
