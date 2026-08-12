import {
  buildTableViewRenderModel,
  findTableViewTimer,
  getTableViewEmptyMessage,
  isTableViewConfigured,
} from '@/features/views/runtime/TableViewModel';

const items = [
  { id: 'a', title: 'A', fields: { status: 'todo', theme: 'work' } },
  { id: 'b', title: 'B', fields: { status: 'done', theme: 'work' } },
] as any[];

describe('TableViewModel', () => {
  it('guards missing row/column config', () => {
    expect(isTableViewConfigured('', 'theme')).toBe(false);
    expect(isTableViewConfigured('status', '')).toBe(false);
    expect(isTableViewConfigured('status', 'theme')).toBe(true);

    const model = buildTableViewRenderModel({ items, rowField: '', colField: 'theme' });
    expect(model.isConfigured).toBe(false);
    expect(model.emptyMessage).toBe(getTableViewEmptyMessage());
  });

  it('builds a configured matrix render model', () => {
    const model = buildTableViewRenderModel({ items, rowField: 'status', colField: 'theme' });
    expect(model.isConfigured).toBe(true);
    expect(model.sortedRows).toEqual(expect.arrayContaining(['todo', 'done']));
    expect(model.sortedCols).toContain('work');
  });

  it('finds table timers by task id', () => {
    expect(findTableViewTimer([{ taskId: 'b', status: 'paused' }], 'b')?.status).toBe('paused');
    expect(findTableViewTimer([{ taskId: 'b' }], 'missing')).toBeUndefined();
  });
});
