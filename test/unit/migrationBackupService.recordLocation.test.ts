import { MigrationBackupService } from '@/core/services/item/MigrationBackupService';
import type { VaultPort } from '@/core/ports/VaultPort';

describe('MigrationBackupService record location', () => {
  test('collects Markdown paths from source/file location instead of stable Record IDs', async () => {
    const writes = new Map<string, string>();
    const files = new Map<string, string>([
      ['01/a.md', 'A'],
      ['01/b.md', 'B'],
    ]);
    const vault: VaultPort = {
      readFile: async (path) => files.get(path) ?? null,
      listMarkdownFilePaths: () => Array.from(files.keys()),
      writeFile: async (path, content) => { writes.set(path, content); },
      deleteFile: async () => {},
    };
    const dataStore = {
      queryItems: () => [
        { id: 'task.01J00000000000000000000001', source: { path: '01/a.md', startLine: 10, endLine: 20, modified: 1 } },
        { id: 'rec.01J00000000000000000000002', file: { path: '01/b.md', line: 3 } },
        { id: 'task.01J00000000000000000000003', source: { path: '01/a.md', startLine: 30, endLine: 40, modified: 1 } },
      ],
    };

    const service = new MigrationBackupService(dataStore as any, vault);
    const result = await service.createMigrationBackup('ThinkOS/Backups/test', { schemaVersion: 2 });

    expect(result.markdownFileCount).toBe(2);
    expect(result.failedPaths).toEqual([]);
    expect(JSON.parse(writes.get('ThinkOS/Backups/test/markdown-paths.json') || '[]')).toEqual(['01/a.md', '01/b.md']);
    expect(writes.get('ThinkOS/Backups/test/markdown/01/a.md')).toBe('A');
    expect(writes.get('ThinkOS/Backups/test/markdown/01/b.md')).toBe('B');
  });
});
