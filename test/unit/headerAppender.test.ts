import { appendUnderHeader } from '@/core/recordInput/mutation/HeaderAppender';

function createMemoryVault(initial: Record<string, string | null> = {}) {
  const files = new Map(Object.entries(initial));
  return {
    files,
    async readFile(path: string): Promise<string | null> {
      return files.get(path) ?? null;
    },
    async writeFile(path: string, content: string): Promise<void> {
      files.set(path, content);
    },
  };
}

describe('appendUnderHeader', () => {
  it('creates a missing header and appends payload under it', async () => {
    const vault = createMemoryVault({ 'log.md': '开头' });
    await appendUnderHeader(vault, 'log.md', '## 今天', '记录块A');
    expect(vault.files.get('log.md')).toBe('开头\n\n## 今天\n\n记录块A');
  });

  it('inserts before the next same-or-higher level header', async () => {
    const vault = createMemoryVault({ 'log.md': '## 今天\n旧内容\n## 明天' });
    await appendUnderHeader(vault, 'log.md', '## 今天', '记录块B');
    expect(vault.files.get('log.md')).toBe('## 今天\n旧内容\n\n记录块B\n## 明天');
  });

  it('honors abort checks before writing', async () => {
    const vault = createMemoryVault({ 'log.md': '## 今天' });
    const signal = { aborted: true } as AbortSignal;
    await expect(appendUnderHeader(vault, 'log.md', '## 今天', '记录块A', { signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(vault.files.get('log.md')).toBe('## 今天');
  });
});
