/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F121/error
 * @covers F121/unit
 */
import type { VaultPort } from '@/core/ports/VaultPort';
import type { MetadataPort } from '@/core/ports/MetadataPort';
import type { FileStatPort } from '@/core/ports/FileStatPort';
import { DataStoreFileScanner } from '@/core/services/dataStore/DataStoreFileScanner';
import { encodeRecordBlock } from '@/core/records/codec';

function harness(content: string | null, stat: any = { ctime: 1, mtime: 2, size: 100 }) {
  const vault: VaultPort = {
    readFile: jest.fn(async () => content),
    listMarkdownFilePaths: () => [],
    writeFile: jest.fn(async () => undefined),
    deleteFile: jest.fn(async () => undefined),
  };
  const metadata: MetadataPort = { getHeadings: jest.fn(async () => []) };
  const fileStat: FileStatPort = { stat: jest.fn(async () => stat) };
  return { vault, metadata, fileStat, scanner: new DataStoreFileScanner(vault, metadata, fileStat) };
}

describe('DataStoreFileScanner 单文件扫描规则', () => {
  it('非法路径、文件不可读、stat 缺失时都返回 null，不制造幽灵 Record', async () => {
    const invalid = harness('anything');
    await expect(invalid.scanner.scan({} as any)).resolves.toBeNull();

    const unreadable = harness(null);
    await expect(unreadable.scanner.scan('missing.md')).resolves.toBeNull();

    const noStat = harness('# note', null);
    await expect(noStat.scanner.scan('nostat.md')).resolves.toBeNull();
  });

  it('扫描合法 Record 时把 heading 与 section tag 一起归一化到 Record 来源上下文', async () => {
    const block = encodeRecordBlock({
      recordId: 'rec.01JWF7T20074QW3VAKQMEWSBK0',
      recordType: 'thought',
      fields: { 内容: '扫描测试' },
    });
    const content = `# 健康 #项目/ThinkOS\n${block}`;
    const h = harness(content, { ctime: 10, mtime: 20, size: content.length });
    (h.metadata.getHeadings as jest.Mock).mockResolvedValue([{ line: 0, heading: '健康 #项目/ThinkOS' }]);

    const scanned = await h.scanner.scan('records/notes.md');
    expect(scanned?.items).toHaveLength(1);
    const item = scanned?.items[0] as any;
    expect(item.id).toBe('rec.01JWF7T20074QW3VAKQMEWSBK0');
    expect(item.header).toBe('健康');
    expect(item.tags).toEqual(expect.arrayContaining(['#项目/ThinkOS']));
    expect(item.sectionTags).toBeUndefined();
    expect(item.source).toMatchObject({ path: 'records/notes.md', modified: 20 });
    expect(scanned?.integrityIssues).toEqual([]);
  });
});
