/**
 * @covers F015/regression
 * @covers F017/regression
 * @covers F121/regression
 */
import { withRecordFileLocks, mutateRecordFile } from '@/core/records/RecordFileCoordinator';
import { preserveRecordMetadataOnEdit, originalRecordCreatedAt } from '@/core/recordInput/mutation/preserveFields';
import { encodeRecordBlock, decodeRecordContentLines } from '@/core/records/codec/MarkdownRecordCodec';
import { decodeMarkdownFieldValue, decodeUnknownMarkdownKvValue, FIELD_CODEC_PRESETS } from '@/core/records/codec/FieldValueCodec';
import type { VaultPort } from '@/core/ports/VaultPort';
import { InputService } from '@/core/services/InputService';

describe('Record Markdown 数据完整性', () => {
  it('direct append uses a shared per-path lock and preserves two concurrent saves', async () => {
    const files = new Map<string, string>();
    const vault: VaultPort = {
      readFile: async path => files.get(path) ?? null,
      writeFile: async (path, content) => { await Promise.resolve(); files.set(path, content); },
      deleteFile: async path => { files.delete(path); },
      listMarkdownFilePaths: () => [...files.keys()],
    };
    const append = (text: string) => withRecordFileLocks(vault, ['daily.md'], () => mutateRecordFile(vault, 'daily.md', current => `${current || ''}${text}`));
    await Promise.all([append('A'), append('B')]);
    expect(files.get('daily.md')).toBe('AB');
  });

  it('retries only an identical Record ID payload and refuses differing content', async () => {
    const recordId = 'thought.01JWF7T20074QW3VAKQMEWSBK0';
    const original = `<!-- start -->\n记录ID:: ${recordId}\n记录类型:: thought\n内容:: 原文\n<!-- end -->`;
    const files = new Map([['daily.md', original]]);
    const vault: VaultPort = {
      readFile: async path => files.get(path) ?? null,
      writeFile: async (path, data) => { files.set(path, data); },
      deleteFile: async path => { files.delete(path); },
      listMarkdownFilePaths: () => [...files.keys()],
    };
    const service = new InputService(vault, { getRecordLocation: () => null } as never);
    await service.appendDirectRecord('daily.md', original, null, { recordId });
    expect(files.get('daily.md')).toBe(original);
    await expect(service.appendDirectRecord('daily.md', original.replace('原文', '新内容'), null, { recordId }))
      .rejects.toThrow('相同 ID');
    expect(files.get('daily.md')).toBe(original);
  });

  it('keeps original dates, invisible KV and removed-template fields while allowing explicit clears', () => {
    const original = [
      '<!-- start -->', '记录ID:: task.01JWF7T20074QW3VAKQMEWSBK0', '记录类型:: task',
      '创建于:: 2024-01-01 09:00', '完成于:: 2024-01-02 10:00', '项目编号:: 00123',
      '可编辑字段:: 删除我', '内容:: 原正文', '<!-- end -->',
    ].join('\n');
    const replacement = [
      '<!-- start -->', '记录ID:: task.01JWF7T20074QW3VAKQMEWSBK0', '记录类型:: task',
      '创建于:: 2026-11-04 10:00', '完成于:: 2026-11-04 10:00', '内容:: 新正文', '<!-- end -->',
    ].join('\n');
    const result = preserveRecordMetadataOnEdit(original, replacement, {
      fields: [{ id: 'f1', key: '内容', label: '内容', type: 'textarea', semantic: 'body' },
        { id: 'f2', key: '可编辑字段', label: '可编辑字段', type: 'text' }],
    });
    expect(originalRecordCreatedAt(original)).toBe('2024-01-01 09:00');
    expect(result).toContain('创建于:: 2024-01-01 09:00');
    expect(result).toContain('完成于:: 2024-01-02 10:00');
    expect(result).toContain('项目编号:: 00123');
    expect(result).not.toContain('可编辑字段:: 删除我');
    expect(result).toContain('内容:: 新正文');
  });

  it('does not drop existing body if the current template no longer owns a body field', () => {
    const original = '<!-- start -->\n记录ID:: x\n记录类型:: thought\n内容:: 原正文\n第二行\n<!-- end -->';
    const replacement = '<!-- start -->\n记录ID:: x\n记录类型:: thought\n<!-- end -->';
    const actual = preserveRecordMetadataOnEdit(original, replacement, { fields: [] });
    expect(actual).toContain('内容:: 原正文\n第二行');
  });

  it('round-trips body markers without allowing a premature Record end', () => {
    const body = '一行\n<!-- end -->\n\\<!-- start -->\n二行';
    const markdown = encodeRecordBlock({
      recordId: 'thought.01JWF7T20074QW3VAKQMEWSBK0',
      recordType: 'thought',
      fields: { 内容: body },
    });
    expect(markdown.match(/^<!-- end -->$/gm)).toHaveLength(1);
    const lines = markdown.split('\n');
    expect(decodeRecordContentLines(lines.slice(1, -1), '').content).toBe(body);
  });

  it('keeps legacy numeric/boolean KV semantics while preserving leading-zero identifiers and typed text', () => {
    expect(decodeUnknownMarkdownKvValue('00123')).toBe('00123');
    expect(decodeUnknownMarkdownKvValue('00.50')).toBe('00.50');
    // Without a declared schema, existing Energy/rating records rely on this
    // historical inference; canonical numbers must not silently become text.
    expect(decodeUnknownMarkdownKvValue('42')).toBe(42);
    expect(decodeUnknownMarkdownKvValue('true')).toBe(true);
    expect(decodeMarkdownFieldValue('00123', FIELD_CODEC_PRESETS.text)).toBe('00123');
    expect(decodeMarkdownFieldValue('42', FIELD_CODEC_PRESETS.text)).toBe('42');
    expect(decodeMarkdownFieldValue('42', FIELD_CODEC_PRESETS.number)).toBe(42);
    expect(decodeMarkdownFieldValue('true', FIELD_CODEC_PRESETS.boolean)).toBe(true);
  });
});
