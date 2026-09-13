/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F076/performance
 */
import { RetrievalService } from '@/core/ai/RetrievalService';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import { recordPerformanceMetric } from './support/performanceRecorder';

const COUNT = 10_000;
const BUILD_BUDGET_MS = 5_000;
const SEARCH_BUDGET_MS = 1_500;

function record(index: number): RecordViewItem {
  const goal = index % 2 === 0 ? '工作/Think OS' : '生活/健康';
  const block = index % 3 === 0 ? 'task' : 'thought';
  return {
    id: `r-${index}`,
    title: `记录 ${index}`,
    content: index % 100 === 0 ? `性能关键字 ${index}` : `普通内容 ${index}`,
    tags: index % 5 === 0 ? ['测试'] : [],
    created: index,
    modified: index,
    goalPath: goal,
    recordType: block,
    extra: {},
  } as RecordViewItem;
}

describe('AI 本地检索性能基线', () => {
  it('一万条记录可在基线预算内建索引并执行带 Goal/类型过滤的查询', () => {
    const items = Array.from({ length: COUNT }, (_, index) => record(index));
    const service = new RetrievalService({ queryItems: () => items } as any);

    const buildStart = Date.now();
    service.buildIndex();
    const buildMs = Date.now() - buildStart;

    const searchStart = Date.now();
    const result = service.search('性能关键字', {
      goalPaths: ['工作'], recordTypes: ['task'], limit: 100,
    });
    const searchMs = Date.now() - searchStart;

    recordPerformanceMetric({ id: 'retrieval.build', label: 'AI 本地检索建索引', valueMs: buildMs, budgetMs: BUILD_BUDGET_MS, sampleSize: COUNT });
    recordPerformanceMetric({ id: 'retrieval.search', label: 'AI 本地检索过滤查询', valueMs: searchMs, budgetMs: SEARCH_BUDGET_MS, sampleSize: COUNT });
    console.info(`检索性能：${COUNT} 条建索引 ${buildMs}ms；过滤查询 ${searchMs}ms；命中 ${result.totalMatched} 条`);
    expect(service.getIndexStats().itemCount).toBe(COUNT);
    expect(result.items.every((item) => item.goalPath?.startsWith('工作/') && item.recordType === 'task')).toBe(true);
    expect(buildMs).toBeLessThan(BUILD_BUDGET_MS);
    expect(searchMs).toBeLessThan(SEARCH_BUDGET_MS);
  });
});
