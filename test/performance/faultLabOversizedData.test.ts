/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F011/performance
 * @covers F120/performance
 * @covers F121/performance
 * @covers F132/performance
 * @fault FL-SCALE-001
 */
import { encodeRecordBlock } from '@/core/records/codec';
import { 创建故障实验环境, 生成超大字段字符 } from '../support/faultLab';

const HUGE_ID = 'rec.01JWF7T20074QW3VAKQMEWSBKD';

describe('v9 故障实验室：超大单条记录性能边界', () => {
  it('512KiB正文仍能完成扫描和索引，并保持内容完整', async () => {
    const huge = 生成超大字段字符(512 * 1024);
    const markdown = encodeRecordBlock({
      recordId: HUGE_ID,
      recordType: 'thought',
      fields: { 记录子类型: '思考', 内容: huge },
    });
    const h = 创建故障实验环境({ '规模/超大记录.md': markdown });
    const startedAt = Date.now();

    await h.dataStore.scanAll();

    const elapsed = Date.now() - startedAt;
    const record = h.dataStore.getRecordById(HUGE_ID);
    expect(record?.content).toBe(huge.trim());
    expect(record?.content.length).toBeGreaterThan(500 * 1024);
    expect(elapsed).toBeLessThan(3000);
    h.dataStore.dispose();
  });
});
