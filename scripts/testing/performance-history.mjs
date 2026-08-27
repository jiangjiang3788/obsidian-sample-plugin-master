#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { HISTORY_DIR, appendJsonArray, ensureHistoryDir, readJsonSafe, writeJson } from './history-utils.mjs';

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function updatePerformanceHistory(metricsFile = path.resolve('reports/testing/performance-latest.jsonl')) {
  const config = readJsonSafe(path.resolve('test/system/test-governance.json'), {});
  const perfConfig = config.performance || {};
  const warningRatio = Number(perfConfig.warningRegressionRatio ?? 0.2);
  const criticalRatio = Number(perfConfig.criticalRegressionRatio ?? 0.5);
  const window = Number(perfConfig.comparisonWindow ?? 5);
  const historyLimit = Number(config.historyLimit ?? 60);

  ensureHistoryDir();
  const historyFile = path.join(HISTORY_DIR, 'performance-history.json');
  const existing = readJsonSafe(historyFile, []);
  const history = Array.isArray(existing) ? existing : [];
  const latest = [];
  if (fs.existsSync(metricsFile)) {
    for (const line of fs.readFileSync(metricsFile, 'utf8').split(/\r?\n/).filter(Boolean)) {
      try { latest.push(JSON.parse(line)); } catch {}
    }
  }

  const evaluated = latest.map((metric) => {
    const previous = history.filter((row) => row.id === metric.id).slice(-window);
    const previousMedian = median(previous.map((row) => Number(row.valueMs)).filter(Number.isFinite));
    const regressionRatio = previousMedian && previousMedian > 0 ? (Number(metric.valueMs) - previousMedian) / previousMedian : null;
    const budgetRatio = Number(metric.budgetMs) > 0 ? Number(metric.valueMs) / Number(metric.budgetMs) : null;
    let trend = '首次记录';
    if (regressionRatio != null) {
      if (regressionRatio >= criticalRatio) trend = '明显变慢';
      else if (regressionRatio >= warningRatio) trend = '需要关注';
      else if (regressionRatio <= -warningRatio) trend = '明显变快';
      else trend = '稳定';
    }
    return {
      ...metric,
      previousMedianMs: previousMedian == null ? null : Number(previousMedian.toFixed(3)),
      regressionRatio: regressionRatio == null ? null : Number(regressionRatio.toFixed(4)),
      budgetRatio: budgetRatio == null ? null : Number(budgetRatio.toFixed(4)),
      trend,
      runAt: new Date().toISOString(),
    };
  });

  let merged = history;
  for (const metric of evaluated) merged = appendJsonArray(historyFile, metric, historyLimit * Math.max(1, evaluated.length));
  if (!evaluated.length && !fs.existsSync(historyFile)) writeJson(historyFile, []);

  const lines = [
    '# Think OS 性能趋势报告', '',
    `- 本次指标：${evaluated.length} 项`,
    `- 历史记录文件：\`reports/testing/history/performance-history.json\``,
    '- “需要关注/明显变慢”只表示相对近期历史退化；真正阻断仍由性能测试里的灾难性预算断言决定。', '',
    '## 本次结果', '',
    '| 指标 | 本次 | 预算 | 近期中位数 | 趋势 |',
    '|---|---:|---:|---:|---|',
  ];
  for (const item of evaluated) {
    lines.push(`| ${String(item.label || item.id).replace(/\|/g, '\\|')} | ${Number(item.valueMs).toFixed(1)}ms | ${Number(item.budgetMs).toFixed(0)}ms | ${item.previousMedianMs == null ? '—' : `${Number(item.previousMedianMs).toFixed(1)}ms`} | ${item.trend} |`);
  }
  if (!evaluated.length) lines.push('| — | — | — | — | 本次没有可读取的性能指标 |');

  const byId = new Map();
  for (const row of merged) {
    const list = byId.get(row.id) || [];
    list.push(row);
    byId.set(row.id, list);
  }
  lines.push('', '## 最近趋势', '', '| 指标 | 最近记录 | 最近 5 次 |', '|---|---:|---|');
  for (const [id, rows] of byId) {
    const recent = rows.slice(-5);
    const last = recent.at(-1);
    lines.push(`| ${String(last?.label || id).replace(/\|/g, '\\|')} | ${Number(last?.valueMs || 0).toFixed(1)}ms | ${recent.map((r) => `${Number(r.valueMs).toFixed(0)}`).join(' → ')} ms |`);
  }
  fs.writeFileSync(path.join(HISTORY_DIR, 'performance-trend.md'), `${lines.join('\n')}\n`);

  console.log('\n【性能趋势】');
  if (!evaluated.length) {
    console.log('- 本次没有读取到机器可读性能指标。');
    return { evaluated, history: merged };
  }
  for (const item of evaluated) console.log(`- ${item.label || item.id}：${Number(item.valueMs).toFixed(1)}ms / 预算 ${Number(item.budgetMs).toFixed(0)}ms / ${item.trend}`);
  console.log('- 报告：reports/testing/history/performance-trend.md');
  return { evaluated, history: merged };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('performance-history.mjs')) {
  updatePerformanceHistory(process.argv[2] ? path.resolve(process.argv[2]) : undefined);
}
