import { getItemFilePath, getItemLineNumber } from '@/app/usecases/recordInput/locator';

describe('recordInput location helpers', () => {
  it('reads mutable storage location from Record source metadata', () => {
    const item = {
      id: 'task.01J00000000000000000000042',
      source: { path: 'New/path.md', startLine: 12, endLine: 20, modified: 1 },
      file: { path: 'Stale/path.md', line: 8 },
    } as any;
    expect(getItemFilePath(item)).toBe('New/path.md');
    expect(getItemLineNumber(item)).toBe(12);
  });

  it('falls back to file metadata without decoding the Record ID', () => {
    const item = { id: 'rec.01J00000000000000000000043', file: { path: 'Records.md', line: 7 } } as any;
    expect(getItemFilePath(item)).toBe('Records.md');
    expect(getItemLineNumber(item)).toBe(7);
  });
});
