/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F124/error
 * @covers F124/integration
 * @covers F124/persistence
 * @fault FL-MIG-001
 */
import type { VaultPort } from '@/core/ports/VaultPort';
import type { DataStore } from '@/core/services/DataStore';
import { MigrationBackupService } from '@/core/services/item/MigrationBackupService';

function createVault(initial: Record<string, string>) {
  const files = new Map(Object.entries(initial));
  const vault: VaultPort = {
    readFile: jest.fn(async (path) => files.get(path) ?? null),
    listMarkdownFilePaths: () => [...files.keys()].filter((path) => path.endsWith('.md')),
    writeFile: jest.fn(async (path, content) => { files.set(path, content); }),
    deleteFile: jest.fn(async (path) => { files.delete(path); }),
  };
  return { files, vault };
}

describe('P0 迁移前备份的数据安全', () => {
  it('一个 Markdown 文件缺失时仍备份其他文件，并在 manifest 中明确记录失败路径', async () => {
    const h = createVault({
      'records/a.md': '# A\n内容',
      'records/b.md': '# B\n内容',
    });
    const dataStore = {
      queryItems: () => [
        { id: 'rec.a', source: { path: 'records/a.md' } },
        { id: 'rec.b', source: { path: 'records/b.md' } },
        { id: 'rec.missing', source: { path: 'records/missing.md' } },
        { id: 'rec.a.duplicate-location', source: { path: 'records/a.md' } },
      ],
    } as unknown as DataStore;
    const service = new MigrationBackupService(dataStore, h.vault);

    const result = await service.createMigrationBackup('ThinkOS/Backups/test', { version: 'current' });

    expect(result.markdownFileCount).toBe(2);
    expect(result.failedPaths).toEqual(['records/missing.md']);
    expect(h.files.get('ThinkOS/Backups/test/markdown/records/a.md')).toBe('# A\n内容');
    expect(h.files.get('ThinkOS/Backups/test/markdown/records/b.md')).toBe('# B\n内容');

    const paths = JSON.parse(h.files.get('ThinkOS/Backups/test/markdown-paths.json') || '[]');
    expect(paths).toEqual(['records/a.md', 'records/b.md', 'records/missing.md']);

    const manifest = JSON.parse(h.files.get('ThinkOS/Backups/test/manifest.json') || '{}');
    expect(manifest.markdownFileCount).toBe(2);
    expect(manifest.failedPaths).toEqual(['records/missing.md']);
    expect(h.files.has('ThinkOS/Backups/test/data-settings.json')).toBe(true);
  });
});
