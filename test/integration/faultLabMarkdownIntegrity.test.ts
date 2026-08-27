/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F011/error
 * @covers F013/error
 * @covers F018/error
 * @covers F019/error
 * @covers F053/error
 * @covers F054/error
 * @covers F120/error
 * @covers F121/error
 * @fault FL-MD-001
 * @fault FL-MD-002
 * @fault FL-MD-003
 * @fault FL-ID-001
 * @fault FL-REF-001
 * @fault FL-TEXT-001
 */
import { 创建故障实验环境, 读取故障样本 } from '../support/faultLab';

const DUPLICATE_ID = 'rec.01JWF7T20074QW3VAKQMEWSBK2';
const ORPHAN_TASK_ID = 'task.01JWF7T20074QW3VAKQMEWSBK5';
const SPECIAL_ID = 'rec.01JWF7T20074QW3VAKQMEWSBK7';

describe('v9 故障实验室：Markdown 与索引完整性', () => {
  it('缺少稳定记录ID时隔离坏块并留下明确完整性问题', async () => {
    const h = 创建故障实验环境({
      '故障/缺少ID.md': 读取故障样本('markdown/缺少记录ID.md'),
      '正常.md': 读取故障样本('markdown/合法思考.md'),
    });

    await h.dataStore.scanAll();

    expect(h.dataStore.queryRecords()).toHaveLength(1);
    expect(h.dataStore.getRecordIntegrityIssues()).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'record_id_missing', path: '故障/缺少ID.md' }),
    ]));
    h.dataStore.dispose();
  });

  it('非法任务状态不会污染任务索引，同时其他合法记录继续可用', async () => {
    const h = 创建故障实验环境({
      '故障/非法任务.md': 读取故障样本('markdown/非法任务状态.md'),
      '正常.md': 读取故障样本('markdown/合法思考.md'),
    });

    await h.dataStore.scanAll();

    expect(h.dataStore.queryRecords()).toHaveLength(1);
    expect(h.dataStore.getRecordIntegrityIssues()).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'record_block_malformed', path: '故障/非法任务.md' }),
    ]));
    h.dataStore.dispose();
  });

  it('半写入记录块不会凭文件位置制造伪身份，扫描流程正常结束', async () => {
    const h = 创建故障实验环境({
      '故障/半写入.md': 读取故障样本('markdown/半写入记录.md'),
    });

    await expect(h.dataStore.scanAll()).resolves.toBeUndefined();
    expect(h.dataStore.queryRecords()).toEqual([]);
    expect(h.dataStore.getRecordLocations('rec.01JWF7T20074QW3VAKQMEWSBK4')).toEqual([]);
    h.dataStore.dispose();
  });

  it('两个文件出现相同稳定ID时不选边站，保留冲突位置并报告重复身份', async () => {
    const h = 创建故障实验环境({
      '重复/A.md': 读取故障样本('markdown/重复记录-A.md'),
      '重复/B.md': 读取故障样本('markdown/重复记录-B.md'),
    });

    await h.dataStore.scanAll();

    expect(h.dataStore.getRecordById(DUPLICATE_ID)).toBeNull();
    expect(h.dataStore.getRecordLocations(DUPLICATE_ID)).toHaveLength(2);
    expect(h.dataStore.getRecordIntegrityIssues()).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'record_id_duplicate', recordId: DUPLICATE_ID }),
    ]));
    h.dataStore.dispose();
  });

  it('任务引用不存在的TaskSeries时保留任务并报告孤儿引用，不猜测其他系列', async () => {
    const h = 创建故障实验环境({
      '任务/孤儿.md': 读取故障样本('markdown/孤儿循环任务.md'),
    });

    await h.dataStore.scanAll();

    expect(h.dataStore.getRecordById(ORPHAN_TASK_ID)?.coreBlock).toBe('task');
    expect(h.dataStore.getRecordIntegrityIssues()).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'task_series_reference_orphan', recordId: ORPHAN_TASK_ID }),
    ]));
    h.dataStore.dispose();
  });

  it('正文包含中文、Emoji、链接、标签、竖线和双冒号时仍保持正文语义', async () => {
    const h = 创建故障实验环境({
      '边界/特殊字符.md': 读取故障样本('markdown/自定义字段与特殊字符.md'),
    });

    await h.dataStore.scanAll();

    const record = h.dataStore.getRecordById(SPECIAL_ID);
    expect(record?.content).toBe('中文😀 emoji / pipes | / 双冒号:: / [[链接]] / #标签');
    expect(record?.id).toBe(SPECIAL_ID);
    expect(record?.extra).not.toHaveProperty('双冒号');
    expect(h.dataStore.getRecordIntegrityIssues()).toEqual([]);
    h.dataStore.dispose();
  });
});
