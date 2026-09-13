/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F014/integration
 * @covers F014/persistence
 * @covers F015/integration
 * @covers F015/persistence
 * @covers F016/integration
 * @covers F016/persistence
 * @covers F017/integration
 * @covers F020/integration
 * @covers F020/persistence
 * @covers F043/integration
 * @covers F043/persistence
 * @covers F045/integration
 * @covers F045/persistence
 * @covers F121/integration
 */
import { describe, expect, it } from '@jest/globals';

import type { VaultPort } from '@/core/ports/VaultPort';
import type { RecordEntity } from '@/core/records/RecordEntity';
import { RecordRepository } from '@/core/records/RecordRepository';
import type { DataStore } from '@/core/services/DataStore';
import { parseRecordBlock } from '@/core/utils/parser';

function createHarness(initial: Record<string, string> = {}, failWrite?: (path: string, content: string, count: number) => boolean) {
  const files = new Map(Object.entries(initial));
  const records = new Map<string, RecordEntity>();
  const locations = new Map<string, { path: string; startLine: number; endLine: number; modified: number }>();
  let writes = 0;

  const vault: VaultPort = {
    readFile: async (path: string) => files.get(path) ?? null,
    listMarkdownFilePaths: () => [...files.keys()].filter(path => path.endsWith('.md')),
    writeFile: async (path: string, content: string) => {
      writes += 1;
      if (failWrite?.(path, content, writes)) throw new Error(`write-failed:${path}`);
      files.set(path, content);
    },
    deleteFile: async (path: string) => { files.delete(path); },
  };

  const scanFileByPath = async (path: string) => {
    for (const [id, location] of [...locations.entries()]) {
      if (location.path === path) { locations.delete(id); records.delete(id); }
    }
    const lines = (files.get(path) ?? '').split(/\r?\n/);
    for (let start = 0; start < lines.length; start += 1) {
      if (lines[start].trim() !== '<!-- start -->') continue;
      const end = lines.findIndex((line, index) => index > start && line.trim() === '<!-- end -->');
      if (end < 0) break;
      const parsed = parseRecordBlock(path, lines, start, end, '记录');
      if (parsed) {
        parsed.source = { path, startLine: start + 1, endLine: end + 1, modified: writes };
        records.set(parsed.id, parsed);
        locations.set(parsed.id, { path, startLine: start + 1, endLine: end + 1, modified: writes });
      }
      start = end;
    }
  };

  const dataStore = {
    getRecordEntityById: (id: string) => records.get(id) ?? null,
    getRecordLocation: (id: string) => locations.get(id) ?? null,
    getRecordLocations: (id: string) => locations.has(id) ? [locations.get(id)!] : [],
    scanFileByPath,
    notifyChange: () => undefined,
    reportRecordIntegrityIssue: () => undefined,
  } as unknown as DataStore;

  return { files, records, locations, vault, dataStore, repository: new RecordRepository(vault, dataStore), scanFileByPath };
}

describe('integration: RecordRepository lifecycle', () => {
  it('creates, rescans, patches and deletes one canonical Record by stable ID', async () => {
    const h = createHarness();
    const id = 'rec.01JWF7T20074QW3VAKQMEWSBE0';

    const created = await h.repository.create({
      recordId: id,
      recordType: 'thought',
      targetFilePath: 'records.md',
      fields: { 记录子类型: '思考', 内容: '第一版', 清晰度: 2 },
    });
    expect(created.id).toBe(id);
    expect(h.files.get('records.md')).toContain(`记录ID:: ${id}`);

    const updated = await h.repository.update(id, { content: '第二版', 清晰度: 5 });
    expect(updated.content).toBe('第二版');
    expect(updated.extra.清晰度).toBe(5);
    expect(h.files.get('records.md')).toContain('清晰度:: 5');

    await h.repository.delete(id);
    expect(h.records.has(id)).toBe(false);
    expect(h.files.get('records.md')).not.toContain(id);
  });

  it('rolls the first file back when a later file write fails in a multi-file batch', async () => {
    const seedA = [
      '<!-- start -->', '记录ID:: rec.01JWF7T20074QW3VAKQMEWSBE1', '记录类型:: thought', '内容:: A0', '<!-- end -->',
    ].join('\n');
    const seedB = [
      '<!-- start -->', '记录ID:: rec.01JWF7T20074QW3VAKQMEWSBE2', '记录类型:: event', '内容:: B0', '<!-- end -->',
    ].join('\n');
    const h = createHarness({ 'a.md': seedA, 'b.md': seedB }, (path, content) => path === 'b.md' && content.includes('B1'));
    await h.scanFileByPath('a.md');
    await h.scanFileByPath('b.md');

    await expect(h.repository.batch([
      { kind: 'update', recordId: 'rec.01JWF7T20074QW3VAKQMEWSBE1', patch: { content: 'A1' } },
      { kind: 'update', recordId: 'rec.01JWF7T20074QW3VAKQMEWSBE2', patch: { content: 'B1' } },
    ])).rejects.toThrow('write-failed:b.md');

    expect(h.files.get('a.md')).toBe(seedA);
    expect(h.files.get('b.md')).toBe(seedB);
  });
});
