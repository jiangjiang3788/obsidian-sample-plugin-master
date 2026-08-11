import { parseRecordBlock } from '@/core/utils/parser';
import { encodeRecordBlock } from '@/core/records/codec';
import { RecordIndex } from '@/core/records/RecordIndex';
import type { Item } from '@/core/types/schema';

const TASK_ID = 'task.01J00000000000000000000000';
const NOTE_ID = 'rec.01J00000000000000000000000';

function parseAt(markdown: string, filePath: string, startLine = 1): Item {
  const lines = markdown.split('\n');
  const item = parseRecordBlock(filePath, lines, 0, lines.length - 1, 'root');
  if (!item) throw new Error('fixture failed to parse');
  item.file = { path: filePath, line: startLine };
  item.source = { path: filePath, startLine, endLine: startLine + lines.length - 1, modified: 1 };
  return item;
}

describe('Record Block -> Item -> RecordIndex v2', () => {
  it('keeps identity stable when a record moves files', () => {
    const task = encodeRecordBlock({ recordId: TASK_ID, coreBlock: 'task', fields: { status: 'open', content: 'move me' } });
    const first = parseAt(task, 'a.md', 2);
    const moved = parseAt(task, 'b.md', 20);
    expect(first.id).toBe(moved.id);
    expect(first.source?.path).not.toBe(moved.source?.path);
  });

  it('indexes task and non-task records through one identity layer', () => {
    const task = parseAt(encodeRecordBlock({ recordId: TASK_ID, coreBlock: 'task', fields: { status: 'open', content: 'Task' } }), 'a.md');
    const note = parseAt(encodeRecordBlock({ recordId: NOTE_ID, coreBlock: 'thought', fields: { 内容: 'Note' } }), 'b.md');
    const index = new RecordIndex();
    const items = index.rebuild(new Map([['a.md', [task]], ['b.md', [note]]]));
    expect(items).toHaveLength(2);
    expect(index.getLocation(TASK_ID)?.path).toBe('a.md');
    expect(index.getLocation(NOTE_ID)?.path).toBe('b.md');
  });

  it('isolates duplicate IDs instead of choosing a path/line candidate', () => {
    const block = encodeRecordBlock({ recordId: TASK_ID, coreBlock: 'task', fields: { status: 'open', content: 'duplicate' } });
    const a = parseAt(block, 'a.md', 1);
    const b = parseAt(block, 'b.md', 1);
    const index = new RecordIndex();
    const items = index.rebuild(new Map([['a.md', [a]], ['b.md', [b]]]));
    expect(items).toHaveLength(0);
    expect(index.getLocation(TASK_ID)).toBeNull();
    expect(index.getIssues().some(issue => issue.code === 'record_id_duplicate')).toBe(true);
  });
});
