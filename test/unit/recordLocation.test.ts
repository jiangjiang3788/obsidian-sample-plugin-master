/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F020/regression
 * @covers F020/unit
 */
import { getItemFilePath, getItemLineNumber } from '@/app/usecases/recordInput/locator';
import { makeObsUri } from '@/core/utils/obsidian';
import { normalizeRecordTargetPath, resolveRecordTargetPath, resolveRecordStorageYear } from '@/core/recordInput/storagePath';

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

describe('explicit Record target-file templates', () => {
  it('normalizes path syntax without rewriting the configured taxonomy', () => {
    expect(normalizeRecordTargetPath('\\01\\打卡.md')).toBe('01/打卡.md');
    expect(normalizeRecordTargetPath('/01//目标打卡.md/')).toBe('01/目标打卡.md');
  });

  it('uses the Record occurrence/planning date instead of the current clock when available', () => {
    expect(resolveRecordStorageYear('habit', { 日期: '2024-12-31' }, new Date('2030-01-01'))).toBe(2024);
    expect(resolveRecordStorageYear('task', { status: 'open', scheduledAt: '2027-01-03T09:00' }, new Date('2030-01-01'))).toBe(2027);
    expect(resolveRecordStorageYear('task-session', { sessionEndedAt: '2028-04-02T12:00:00Z' }, new Date('2030-01-01'))).toBe(2028);
    expect(resolveRecordStorageYear('energy', { date: '2029-06-01' }, new Date('2030-01-01'))).toBe(2029);
  });

  it('does not add or replace a year unless the configured template contains {{year}}', () => {
    expect(resolveRecordTargetPath('01/打卡.md', 'habit', { 日期: '2026-09-22' })).toBe('01/打卡.md');
    expect(resolveRecordTargetPath('01/2025/打卡.md', 'habit', { 日期: '2026-09-22' })).toBe('01/2025/打卡.md');
    expect(resolveRecordTargetPath('01/{{year}}/打卡.md', 'habit', { 日期: '2026-09-22' })).toBe('01/2026/打卡.md');
  });

  it('renders {{year}} from the Record business year and keeps other explicit template variables', () => {
    expect(resolveRecordTargetPath(
      '01/{{year}}/{{goal.root}}/{{recordType}}.md',
      'review',
      { 日期: '2024-12-31', goalPath: '武装大脑/复盘整理' },
    )).toBe('01/2024/武装大脑/review.md');
  });
});
