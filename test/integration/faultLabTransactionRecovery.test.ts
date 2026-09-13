/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F014/error
 * @covers F015/error
 * @covers F017/error
 * @covers F017/regression
 * @covers F044/error
 * @covers F120/error
 * @covers F121/error
 * @covers F124/error
 * @covers F125/error
 * @fault FL-TX-001
 * @fault FL-TX-002
 * @fault FL-TX-003
 * @fault FL-SCAN-001
 */
import { encodeRecordBlock } from '@/core/records/codec';
import { RecordTransactionRecoveryError } from '@/core/records/RecordMutationTransaction';
import { 创建故障实验环境 } from '../support/faultLab';

const ID_A = 'rec.01JWF7T20074QW3VAKQMEWSBKA';
const ID_B = 'rec.01JWF7T20074QW3VAKQMEWSBKB';
const ID_C = 'rec.01JWF7T20074QW3VAKQMEWSBKC';

function 记录(id: string, content: string): string {
  return encodeRecordBlock({
    recordId: id,
    recordType: 'thought',
    fields: { 记录子类型: '思考', 内容: content },
  });
}

describe('v9 故障实验室：事务、并发与恢复', () => {
  it('提交预检期间发生外部改写时阻止覆盖，并保留外部内容', async () => {
    const original = 记录(ID_A, '原内容');
    const external = 记录(ID_A, '同步软件的新内容');
    const h = 创建故障实验环境({ '记录/A.md': original });
    await h.dataStore.warmStart();

    // warmStart 已读取一次；update 的 loadPath 是第二次，事务预检是第三次。
    h.vault.注入指定读取时外部改写('记录/A.md', 3, external);

    await expect(h.repository.update(ID_A, { content: '本地准备保存的内容' }))
      .rejects.toThrow('record_write_conflict:记录/A.md');
    expect(h.vault.files.get('记录/A.md')).toBe(external);
    expect(h.vault.writes).toEqual([]);
    h.dataStore.dispose();
  });

  it('第二个文件写盘失败时回滚第一个文件，两个文件都回到提交前内容', async () => {
    const beforeA = 记录(ID_A, 'A0');
    const beforeB = 记录(ID_B, 'B0');
    const h = 创建故障实验环境({ '记录/A.md': beforeA, '记录/B.md': beforeB });
    await h.dataStore.warmStart();
    h.vault.注入写入失败({ path: '记录/B.md', occurrence: 2, message: '故障实验室：第二文件写盘失败' });

    await expect(h.repository.batch([
      { kind: 'update', recordId: ID_A, patch: { content: 'A1' } },
      { kind: 'update', recordId: ID_B, patch: { content: 'B1' } },
    ])).rejects.toThrow('故障实验室：第二文件写盘失败');

    expect(h.vault.files.get('记录/A.md')).toBe(beforeA);
    expect(h.vault.files.get('记录/B.md')).toBe(beforeB);
    h.dataStore.dispose();
  });

  it('写盘失败后回滚也失败时产生强类型恢复错误，并在DataStore留下恢复必需问题', async () => {
    const beforeA = 记录(ID_A, 'A0');
    const beforeB = 记录(ID_B, 'B0');
    const h = 创建故障实验环境({ '记录/A.md': beforeA, '记录/B.md': beforeB });
    await h.dataStore.warmStart();
    h.vault.注入写入失败({ path: '记录/B.md', occurrence: 2, message: '故障实验室：提交失败' });
    h.vault.注入写入失败({ path: '记录/A.md', occurrence: 3, message: '故障实验室：回滚失败' });

    const promise = h.repository.batch([
      { kind: 'update', recordId: ID_A, patch: { content: 'A1' } },
      { kind: 'update', recordId: ID_B, patch: { content: 'B1' } },
    ]);

    await expect(promise).rejects.toBeInstanceOf(RecordTransactionRecoveryError);
    expect(h.vault.files.get('记录/A.md')).toContain('内容:: A1');
    expect(h.vault.files.get('记录/B.md')).toBe(beforeB);
    expect(h.dataStore.getRecordIntegrityIssues()).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'record_transaction_recovery_required' }),
    ]));
    h.dataStore.dispose();
  });

  it('文件已经写成功但提交后重新扫描暂时失败时明确报错，恢复stat后可以重新进入索引', async () => {
    const h = 创建故障实验环境();
    await h.dataStore.warmStart();
    h.vault.注入Stat失败('记录/C.md');

    await expect(h.repository.create({
      recordId: ID_C,
      recordType: 'thought',
      targetFilePath: '记录/C.md',
      fields: { 记录子类型: '思考', 内容: '已经落盘但第一次扫描失败' },
    })).rejects.toThrow('record_post_commit_rescan_failed:记录/C.md');

    expect(h.vault.files.get('记录/C.md')).toContain(`记录ID:: ${ID_C}`);
    expect(h.dataStore.getRecordById(ID_C)).toBeNull();
    expect(h.dataStore.getRecordIntegrityIssues()).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'record_scan_failed', path: '记录/C.md' }),
    ]));

    await h.dataStore.scanFileByPath('记录/C.md', { throwOnError: true });
    expect(h.dataStore.getRecordById(ID_C)?.content).toBe('已经落盘但第一次扫描失败');
    h.dataStore.dispose();
  });
});
