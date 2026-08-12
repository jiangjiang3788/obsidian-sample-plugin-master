import { getItemFilePath, getItemLineNumber } from '@/app/usecases/recordInput/locator';
import { makeObsUri } from '@/core/utils/obsidian';

describe('stable Record storage location', () => {
  it('prefers mutable source metadata and falls back to file metadata', () => {
    const item = {
      id: 'task.01J00000000000000000000042',
      source: { path: 'New/path.md', startLine: 12, endLine: 20, modified: 1 },
      file: { path: 'Stale/path.md', line: 8 },
    } as any;
    expect(getItemFilePath(item)).toBe('New/path.md');
    expect(getItemLineNumber(item)).toBe(12);
    expect(getItemFilePath({ id: 'rec.01J00000000000000000000043', file: { path: 'Records.md', line: 7 } } as any)).toBe('Records.md');
  });

  it('builds Obsidian URIs from storage location without decoding Record IDs', () => {
    expect(makeObsUri({ source: { path: '01/任务.md', startLine: 42 } }, 'My Vault')).toBe(
      'obsidian://advanced-uri?vault=My%20Vault&filepath=01%2F%E4%BB%BB%E5%8A%A1.md&line=42',
    );
    expect(makeObsUri({ file: { path: '01/记录.md', line: 7 } }, 'Vault')).toContain('&line=7');
    expect(makeObsUri({} as any, 'Vault')).toBe('#error-record-location-unavailable');
  });
});
