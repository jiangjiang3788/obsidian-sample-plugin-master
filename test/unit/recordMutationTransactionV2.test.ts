import { RecordMutationTransaction, RecordTransactionRecoveryError } from '@/core/records/RecordMutationTransaction';
import type { VaultPort } from '@/core/ports/VaultPort';

function memoryVault(initial: Record<string, string>, failWrite?: (path: string, content: string, count: number) => boolean) {
  const files = new Map(Object.entries(initial));
  let writes = 0;
  const vault: VaultPort = {
    readFile: jest.fn(async (path: string) => files.get(path) ?? null),
    listMarkdownFilePaths: jest.fn(() => [...files.keys()].filter(path => path.endsWith('.md'))),
    writeFile: jest.fn(async (path: string, content: string) => {
      writes += 1;
      if (failWrite?.(path, content, writes)) throw new Error(`write-failed:${path}`);
      files.set(path, content);
    }),
    deleteFile: jest.fn(async (path: string) => { files.delete(path); }),
  };
  return { vault, files };
}

describe('RecordMutationTransaction v2 stabilization', () => {
  it('blocks a manual-edit conflict before writing anything', async () => {
    const { vault } = memoryVault({ 'a.md': 'manually changed' });
    const transaction = new RecordMutationTransaction(vault);
    await expect(transaction.commit([{ path: 'a.md', before: 'old', after: 'new' }]))
      .rejects.toThrow('record_write_conflict:a.md');
    expect(vault.writeFile).not.toHaveBeenCalled();
  });

  it('rolls already-written files back when a later write fails', async () => {
    const { vault, files } = memoryVault(
      { 'a.md': 'A0', 'b.md': 'B0' },
      (path, content) => path === 'b.md' && content === 'B1',
    );
    const transaction = new RecordMutationTransaction(vault);
    await expect(transaction.commit([
      { path: 'a.md', before: 'A0', after: 'A1' },
      { path: 'b.md', before: 'B0', after: 'B1' },
    ])).rejects.toThrow('write-failed:b.md');
    expect(files.get('a.md')).toBe('A0');
    expect(files.get('b.md')).toBe('B0');
  });

  it('raises a typed recovery error when rollback itself fails', async () => {
    const { vault } = memoryVault(
      { 'a.md': 'A0', 'b.md': 'B0' },
      (path, content) => (path === 'b.md' && content === 'B1') || (path === 'a.md' && content === 'A0'),
    );
    const transaction = new RecordMutationTransaction(vault);
    const promise = transaction.commit([
      { path: 'a.md', before: 'A0', after: 'A1' },
      { path: 'b.md', before: 'B0', after: 'B1' },
    ]);
    await expect(promise).rejects.toBeInstanceOf(RecordTransactionRecoveryError);
    await expect(promise).rejects.toMatchObject({ recoveryFailedPaths: ['a.md'] });
  });
});
