#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { listJsonFilesRecursive, publicTestTitle, readJsonSafe, structuredRunSucceeded, writeJson } from './history-utils.mjs';

function argValue(name, fallback) {
  const direct = process.argv.find((item) => item.startsWith(`${name}=`));
  return direct ? direct.slice(name.length + 1) : fallback;
}

const inputRoot = path.resolve(argValue('--input', 'reports'));
const outputDir = path.resolve(argValue('--output', 'reports/testing'));
fs.mkdirSync(outputDir, { recursive: true });

const files = listJsonFilesRecursive(inputRoot);
const docs = files.map((file) => ({ file, data: readJsonSafe(file, null) })).filter((x) => x.data);

function findLatest(predicate) {
  const matches = docs.filter(({ file, data }) => predicate(file.replace(/\\/g, '/'), data));
  matches.sort((a, b) => {
    const ta = Date.parse(a.data.finishedAt || a.data.generatedAt || a.data.recordedAt || 0) || fs.statSync(a.file).mtimeMs;
    const tb = Date.parse(b.data.finishedAt || b.data.generatedAt || b.data.recordedAt || 0) || fs.statSync(b.file).mtimeMs;
    return tb - ta;
  });
  return matches[0] || null;
}

const feature = findLatest((file, data) => file.endsWith('test-system-report.json') && data.summary);
const coverage = findLatest((file, data) => file.endsWith('coverage-summary.json') && data.total);
const jestRuns = docs.filter(({ data }) => data?.kind === 'jest' && data?.counts);
const e2eRuns = docs.filter(({ data }) => data?.kind === 'e2e' && (data?.counts || typeof data?.success === 'boolean'));
const stabilityJest = findLatest((file, data) => file.endsWith('稳定性审计.json') && Array.isArray(data.cases));
const stabilityE2e = findLatest((file, data) => file.endsWith('真机稳定性审计.json') && Array.isArray(data.cases));
const performance = findLatest((file, data) => file.endsWith('performance-history.json') && Array.isArray(data));

function latestByLabel(keyword) {
  const rows = jestRuns.filter(({ data }) => String(data.label || '').includes(keyword));
  rows.sort((a, b) => Date.parse(b.data.finishedAt || b.data.startedAt || 0) - Date.parse(a.data.finishedAt || a.data.startedAt || 0));
  return rows[0] || null;
}
function latestE2e(suite) {
  const rows = e2eRuns.filter(({ data }) => data.suite === suite);
  rows.sort((a, b) => Date.parse(b.data.finishedAt || b.data.startedAt || 0) - Date.parse(a.data.finishedAt || a.data.startedAt || 0));
  return rows[0] || null;
}

const checks = [
  ['功能测试地图', feature ? Object.values(feature.data.summary || {}).every((s) => Number(s.partial || 0) === 0 && Number(s.missing || 0) === 0) : null, feature?.file],
  ['单元测试', latestByLabel('单元测试') ? structuredRunSucceeded(latestByLabel('单元测试').data) : null, latestByLabel('单元测试')?.file],
  ['组合测试', latestByLabel('组合测试') ? structuredRunSucceeded(latestByLabel('组合测试').data) : null, latestByLabel('组合测试')?.file],
  ['覆盖率测试', latestByLabel('覆盖率测试') ? structuredRunSucceeded(latestByLabel('覆盖率测试').data) : null, latestByLabel('覆盖率测试')?.file],
  ['性能基线', latestByLabel('性能基线测试') ? structuredRunSucceeded(latestByLabel('性能基线测试').data) : null, latestByLabel('性能基线测试')?.file],
  ['故障实验室核心场景', latestByLabel('故障实验室核心测试') ? structuredRunSucceeded(latestByLabel('故障实验室核心测试').data) : null, latestByLabel('故障实验室核心测试')?.file],
  ['故障实验室超大输入', latestByLabel('故障实验室规模测试') ? structuredRunSucceeded(latestByLabel('故障实验室规模测试').data) : null, latestByLabel('故障实验室规模测试')?.file],
  ['P0 真机', latestE2e('p0') ? structuredRunSucceeded(latestE2e('p0').data) : null, latestE2e('p0')?.file],
  ['P1 真机', latestE2e('p1') ? structuredRunSucceeded(latestE2e('p1').data) : null, latestE2e('p1')?.file],
  ['P2 真机', latestE2e('p2') ? structuredRunSucceeded(latestE2e('p2').data) : null, latestE2e('p2')?.file],
  ['大仓库真机', latestE2e('scale') ? structuredRunSucceeded(latestE2e('scale').data) : null, latestE2e('scale')?.file],
  ['版本兼容矩阵', latestE2e('compat') ? structuredRunSucceeded(latestE2e('compat').data) : null, latestE2e('compat')?.file],
  ['Jest 不稳定测试审计', stabilityJest ? Number(stabilityJest.data.flaky?.length || 0) === 0 && Number(stabilityJest.data.failed?.length || 0) === 0 && Number(stabilityJest.data.roundsFailed || 0) === 0 : null, stabilityJest?.file],
  ['P0 真机不稳定测试审计', stabilityE2e ? Number(stabilityE2e.data.flaky?.length || 0) === 0 && Number(stabilityE2e.data.failed?.length || 0) === 0 && Number(stabilityE2e.data.roundsFailed || 0) === 0 : null, stabilityE2e?.file],
];

const failures = checks.filter(([, status]) => status === false);
const unknown = checks.filter(([, status]) => status == null);
const overall = failures.length ? '阻止发布' : unknown.length ? '待补齐运行证据' : '满足发布测试条件';

let coverageText = '未找到覆盖率结果';
if (coverage?.data?.total) {
  const t = coverage.data.total;
  coverageText = `语句 ${t.statements?.pct ?? '—'}%，分支 ${t.branches?.pct ?? '—'}%，函数 ${t.functions?.pct ?? '—'}%，行 ${t.lines?.pct ?? '—'}%`;
}

const perfRows = Array.isArray(performance?.data) ? performance.data.slice(-20) : [];
const perfWarning = perfRows.filter((row) => row.trend === '需要关注' || row.trend === '明显变慢');
const slowCases = [...jestRuns, ...e2eRuns].flatMap(({ data }) => (data.slowCases || []).map((item) => ({ ...item, sourceLabel: data.label || data.suite })))
  .filter((item) => Number.isFinite(item.durationMs)).sort((a, b) => b.durationMs - a.durationMs).slice(0, 15);

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  overall,
  failures: failures.map(([name]) => name),
  unknown: unknown.map(([name]) => name),
  checks: checks.map(([name, status, file]) => ({ name, status: status === true ? '通过' : status === false ? '失败' : '待运行', evidence: file ? path.relative(process.cwd(), file).replace(/\\/g, '/') : null })),
  coverage: coverage?.data?.total || null,
  performanceWarnings: perfWarning,
  slowCases,
};
writeJson(path.join(outputDir, '发布质量报告.json'), report);

const lines = [
  '# Think OS 发布质量报告', '',
  `- 生成时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}`,
  `- 总体结论：**${overall}**`,
  `- 覆盖率：${coverageText}`, '',
  '## 发布检查', '',
  '| 检查项 | 状态 | 证据 |', '|---|---|---|',
];
for (const item of report.checks) lines.push(`| ${item.name} | ${item.status} | ${item.evidence ? `\`${item.evidence}\`` : '—'} |`);
lines.push('', '## 性能趋势警告', '');
if (perfWarning.length) {
  for (const item of perfWarning.slice(-10)) lines.push(`- ${item.label || item.id}：${Number(item.valueMs).toFixed(1)}ms，趋势：${item.trend}`);
} else lines.push('- 未发现历史性能趋势警告，或尚未积累足够历史数据。');
lines.push('', '## 最慢测试', '', '| 耗时 | 用例 | 来源 |', '|---:|---|---|');
for (const item of slowCases) lines.push(`| ${Number(item.durationMs)}ms | ${publicTestTitle(item.title).replace(/\|/g, '\\|')} | ${String(item.file || item.sourceLabel || '—').replace(/\|/g, '\\|')} |`);
if (!slowCases.length) lines.push('| — | 尚无结构化耗时数据 | — |');
lines.push('', '## 判定说明', '', '- “阻止发布”：已有明确失败证据。', '- “待补齐运行证据”：静态体系可能完整，但本次没有收集到所有运行结果。', '- “满足发布测试条件”：本报告要求的运行结果全部存在且通过；仍不能替代人工产品验收。');
fs.writeFileSync(path.join(outputDir, '发布质量报告.md'), `${lines.join('\n')}\n`);

console.log('\n【发布质量报告】');
console.log(`- 总体结论：${overall}`);
if (failures.length) console.log(`- 明确失败：${failures.map(([name]) => name).join('、')}`);
if (unknown.length) console.log(`- 待运行：${unknown.map(([name]) => name).join('、')}`);
const publicReportPath = path.relative(process.cwd(), path.join(outputDir, '发布质量报告.md')).split(path.sep).join('/');
console.log(`- 报告：${publicReportPath}`);
if (process.argv.includes('--strict') && (failures.length || unknown.length)) process.exit(1);
