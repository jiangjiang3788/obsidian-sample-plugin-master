/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F125/error
 * @covers F125/integration
 * @covers F125/regression
 */
import { RecordMigrationTransaction } from '@/app/usecases/recordInput/workflows/RecordMigrationTransaction';

describe('P0 Record 路径变化安全迁移', () => {
  it('先确认新位置已经写入并可扫描，再删除旧记录', async () => {
    const movedRecord = {
      id: 'rec.01JWF7T20074QW3VAKQMEWSBF0',
      recordType: 'thought',
      content: '迁移后的记录',
      source: { path: 'new.md', startLine: 1, endLine: 5, modified: 2 },
    } as any;
    const createRecordAtPlannedLocation = jest.fn(async () => 'new.md');
    const deleteExistingRecord = jest.fn(async () => 'old.md');
    const scanFileByPath = jest.fn(async (path: string) => path === 'new.md' ? [movedRecord] : []);
    const notifyChange = jest.fn();
    const runtime = {
      deps: {
        inputService: { createRecordAtPlannedLocation, deleteExistingRecord },
        itemService: {},
        dataStore: { scanFileByPath, notifyChange },
      },
      getKernel: () => ({}),
    } as any;
    const tx = new RecordMigrationTransaction(runtime);

    const result = await tx.execute({
      item: { ...movedRecord, source: { path: 'old.md', startLine: 1, endLine: 5, modified: 1 } },
      template: {},
      resolved: {},
      normalized: { normalizedFormData: { 内容: '迁移后的记录' } },
      outputPlan: { targetFilePath: 'new.md' },
      persistencePlan: { originalPath: 'old.md' },
      warnings: [],
    } as any);

    expect(result.status).toBe('success');
    expect(createRecordAtPlannedLocation).toHaveBeenCalledTimes(1);
    expect(scanFileByPath).toHaveBeenCalledWith('new.md');
    expect(deleteExistingRecord).toHaveBeenCalledTimes(1);
    expect(createRecordAtPlannedLocation.mock.invocationCallOrder[0]).toBeLessThan(deleteExistingRecord.mock.invocationCallOrder[0]);
    expect(scanFileByPath.mock.invocationCallOrder[0]).toBeLessThan(deleteExistingRecord.mock.invocationCallOrder[0]);
  });

  it('新位置已成功写入但删除旧记录失败时返回 partial_success，并明确保留旧记录而不是回滚新记录', async () => {
    const id = 'rec.01JWF7T20074QW3VAKQMEWSBF1';
    const movedRecord = {
      id,
      recordType: 'thought',
      content: '新位置副本',
      source: { path: 'new.md', startLine: 1, endLine: 5, modified: 2 },
    } as any;
    const createRecordAtPlannedLocation = jest.fn(async () => 'new.md');
    const deleteExistingRecord = jest.fn(async () => { throw new Error('old-delete-failed'); });
    const scanFileByPath = jest.fn(async (path: string) => path === 'new.md' ? [movedRecord] : []);
    const notifyChange = jest.fn();
    const runtime = {
      deps: {
        inputService: { createRecordAtPlannedLocation, deleteExistingRecord },
        itemService: {},
        dataStore: { scanFileByPath, notifyChange },
      },
      getKernel: () => ({}),
    } as any;
    const tx = new RecordMigrationTransaction(runtime);

    const result = await tx.execute({
      item: { ...movedRecord, source: { path: 'old.md', startLine: 1, endLine: 5, modified: 1 } },
      template: {},
      resolved: {},
      normalized: { normalizedFormData: { 内容: '新位置副本' } },
      outputPlan: { targetFilePath: 'new.md' },
      persistencePlan: { originalPath: 'old.md' },
      warnings: [],
    } as any);

    expect(result.status).toBe('partial_success');
    expect(result.affectedPath).toBe('new.md');
    expect(result.affectedRecordId).toBe(id);
    expect(result.errors?.some((entry: any) => entry.code === 'record_update_old_entry_delete_failed')).toBe(true);
    expect(result.feedback?.notice).toContain('旧记录删除失败');
    expect(createRecordAtPlannedLocation).toHaveBeenCalledTimes(1);
    expect(deleteExistingRecord).toHaveBeenCalledTimes(1);
    expect(scanFileByPath).toHaveBeenCalledWith('new.md');
    expect(scanFileByPath).toHaveBeenCalledWith('old.md');
    expect(notifyChange).toHaveBeenCalled();
  });
});
