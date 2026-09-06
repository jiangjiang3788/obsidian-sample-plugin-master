import { appendUnderHeader, appendUnderHeaderText, resolveRecordMarkdownSortKey } from '@/core/recordInput/mutation/HeaderAppender';

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

function record(id: string, date: string, content: string): string {
  return `<!-- start -->\n记录ID:: ${id}\n记录类型:: thought\n目标:: 测试\n日期:: ${date}\n内容:: ${content}\n<!-- end -->`;
}

describe('appendUnderHeader', () => {
  it('creates a missing header and appends a non-record payload under it', async () => {
    const vault = createMemoryVault({ 'log.md': '开头' });
    await appendUnderHeader(vault, 'log.md', '## 今天', '记录块A');
    expect(vault.files.get('log.md')).toBe('开头\n\n## 今天\n\n记录块A');
  });

  it('keeps legacy non-record payload behavior before the next same-or-higher level header', async () => {
    const vault = createMemoryVault({ 'log.md': '## 今天\n旧内容\n## 明天' });
    await appendUnderHeader(vault, 'log.md', '## 今天', '记录块B');
    expect(vault.files.get('log.md')).toBe('## 今天\n旧内容\n\n记录块B\n## 明天');
  });

  it('inserts Record Markdown newest first under the Goal header', () => {
    const newest = record('rec.01K30000000000000000000000', '2025-08-03', 'newest');
    const oldest = record('rec.01K10000000000000000000000', '2025-08-01', 'oldest');
    const middle = record('rec.01K20000000000000000000000', '2025-08-02', 'middle');
    const before = `## 测试\n\n${newest}\n\n${oldest}\n## 其他`;
    const next = appendUnderHeaderText(before, '## 测试', middle);
    expect(next.indexOf('内容:: newest')).toBeLessThan(next.indexOf('内容:: middle'));
    expect(next.indexOf('内容:: middle')).toBeLessThan(next.indexOf('内容:: oldest'));
    expect(next.indexOf('内容:: oldest')).toBeLessThan(next.indexOf('## 其他'));
  });

  it('uses task-session end time as its primary ordering time', () => {
    const late = `<!-- start -->\n记录ID:: tasksession.01K30000000000000000000000\n记录类型:: task-session\n目标:: 测试\n开始于:: 2025-08-03T09:00:00\n结束于:: 2025-08-03T10:00:00\n<!-- end -->`;
    const early = `<!-- start -->\n记录ID:: tasksession.01K20000000000000000000000\n记录类型:: task-session\n目标:: 测试\n开始于:: 2025-08-03T08:00:00\n结束于:: 2025-08-03T08:30:00\n<!-- end -->`;
    const lateKey = resolveRecordMarkdownSortKey(late);
    const earlyKey = resolveRecordMarkdownSortKey(early);
    expect(lateKey).not.toBeNull();
    expect(earlyKey).not.toBeNull();
    expect(lateKey!.primary).toBeGreaterThan(earlyKey!.primary);
  });

  it('honors abort checks before writing', async () => {
    const vault = createMemoryVault({ 'log.md': '## 今天' });
    const signal = { aborted: true } as AbortSignal;
    await expect(appendUnderHeader(vault, 'log.md', '## 今天', '记录块A', { signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(vault.files.get('log.md')).toBe('## 今天');
  });
});
