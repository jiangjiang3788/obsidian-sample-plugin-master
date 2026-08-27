import fs from 'node:fs';
import path from 'node:path';

export type PerformanceMetric = {
  id: string;
  label: string;
  valueMs: number;
  budgetMs: number;
  sampleSize?: number;
  note?: string;
};

/** 性能测试专用：记录机器可读指标，供 v8 趋势治理使用。 */
export function recordPerformanceMetric(metric: PerformanceMetric): void {
  const target = process.env.THINK_PERFORMANCE_METRICS_FILE || 'reports/testing/performance-latest.jsonl';
  if (!target) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.appendFileSync(target, `${JSON.stringify({
    schemaVersion: 1,
    ...metric,
    valueMs: Number(metric.valueMs.toFixed(3)),
    ratioToBudget: metric.budgetMs > 0 ? Number((metric.valueMs / metric.budgetMs).toFixed(4)) : null,
    recordedAt: new Date().toISOString(),
  })}\n`);
}
