/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F018/performance
 * @covers F132/performance
 * @covers F132/regression
 */
import { performance } from 'perf_hooks';
import { RecordIndex } from '@/core/records/RecordIndex';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import { recordPerformanceMetric } from './support/performanceRecorder';

jest.setTimeout(30_000);

function item(index: number): RecordViewItem {
  const id = `rec.perf.${String(index).padStart(8, '0')}`;
  return {
    id,
    recordType: 'thought',
    title: `记录 ${index}`,
    content: `性能样本 ${index}`,
    tags: [],
    created: index,
    modified: index,
    extra: {},
    source: { path: `Perf/${Math.floor(index / 100)}.md`, startLine: (index % 100) * 5 + 1, endLine: (index % 100) * 5 + 4, modified: index },
  } as RecordViewItem;
}

function buildFileMap(count: number): Map<string, RecordViewItem[]> {
  const files = new Map<string, RecordViewItem[]>();
  for (let i = 0; i < count; i += 1) {
    const record = item(i);
    const path = record.source!.path;
    const group = files.get(path) || [];
    group.push(record);
    files.set(path, group);
  }
  return files;
}

describe('P0 RecordIndex 大规模基线', () => {
  it('20,000 条 Record 重建后身份、位置和查询保持完整，并受宽松回归预算保护', () => {
    const count = 20_000;
    const index = new RecordIndex();
    const files = buildFileMap(count);

    const started = performance.now();
    const unique = index.rebuild(files as any);
    const rebuildMs = performance.now() - started;

    expect(unique).toHaveLength(count);
    expect(index.getIssues()).toEqual([]);
    expect(index.getById('rec.perf.00000000')?.content).toBe('性能样本 0');
    expect(index.getById('rec.perf.00019999')?.content).toBe('性能样本 19999');
    expect(index.getLocation('rec.perf.00019999')?.path).toBe('Perf/199.md');

    const lookupStarted = performance.now();
    for (let i = 0; i < count; i += 20) {
      expect(index.getById(`rec.perf.${String(i).padStart(8, '0')}`)).not.toBeNull();
    }
    const lookupMs = performance.now() - lookupStarted;

    recordPerformanceMetric({ id: 'record-index.rebuild', label: 'RecordIndex 重建', valueMs: rebuildMs, budgetMs: 8_000, sampleSize: count });
    recordPerformanceMetric({ id: 'record-index.lookup-1000', label: 'RecordIndex 1000 次查询', valueMs: lookupMs, budgetMs: 1_500, sampleSize: 1_000 });
    console.info(`性能基线：RecordIndex 重建 ${count} 条记录耗时 ${rebuildMs.toFixed(1)} 毫秒；1000 次查询耗时 ${lookupMs.toFixed(1)} 毫秒`);
    // 这里是“灾难性回归门槛”，不是追求机器间毫秒级一致的 benchmark。
    expect(rebuildMs).toBeLessThan(8_000);
    expect(lookupMs).toBeLessThan(1_500);
  });
});
