#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { structuredRunSucceeded } from './history-utils.mjs';

const manifest = JSON.parse(fs.readFileSync('test/system/fault-lab.json', 'utf8'));
const outputDir = path.resolve('reports/testing/fault-lab');
fs.mkdirSync(outputDir, { recursive: true });

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}
function latestResult(label) {
  const suffix = '-结构化结果.json';
  const candidates = fs.existsSync('reports/testing')
    ? fs.readdirSync('reports/testing').filter((name) => name.endsWith(suffix))
    : [];
  const rows = candidates
    .map((name) => ({ file: path.join('reports/testing', name), data: readJson(path.join('reports/testing', name)) }))
    .filter((row) => row.data?.kind === 'jest' && String(row.data?.label || '') === label)
    .sort((a, b) => Date.parse(b.data.finishedAt || 0) - Date.parse(a.data.finishedAt || 0));
  return rows[0] || null;
}

const core = latestResult('故障实验室核心测试');
const scale = latestResult('故障实验室规模测试');
function statusFor(scenario) {
  const run = scenario.runGroup === 'scale' ? scale : core;
  if (!run) return '待运行';
  return structuredRunSucceeded(run.data) ? '通过' : '失败';
}

const scenarios = manifest.scenarios.map((scenario) => ({
  ...scenario,
  status: statusFor(scenario),
}));
const failed = scenarios.filter((item) => item.status === '失败');
const pending = scenarios.filter((item) => item.status === '待运行');
const overall = failed.length ? '存在故障实验失败' : pending.length ? '待补齐运行证据' : '故障实验全部通过';
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  overall,
  counts: {
    total: scenarios.length,
    passed: scenarios.filter((item) => item.status === '通过').length,
    failed: failed.length,
    pending: pending.length,
  },
  runs: {
    core: core ? { success: structuredRunSucceeded(core.data), finishedAt: core.data.finishedAt, file: core.file } : null,
    scale: scale ? { success: structuredRunSucceeded(scale.data), finishedAt: scale.data.finishedAt, file: scale.file } : null,
  },
  scenarios,
};
fs.writeFileSync(path.join(outputDir, '故障实验室报告.json'), JSON.stringify(report, null, 2));

const lines = [
  '# Think OS v9 故障实验室报告', '',
  `- 生成时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}`,
  `- 总体结论：**${overall}**`,
  `- 场景：${report.counts.total}；通过 ${report.counts.passed}；失败 ${report.counts.failed}；待运行 ${report.counts.pending}`, '',
  '## 故障场景矩阵', '',
  '| 编号 | 风险 | 类别 | 场景 | 状态 | 关键预期 |',
  '|---|---|---|---|---|---|',
];
for (const item of scenarios) {
  lines.push(`| ${item.id} | ${item.risk} | ${item.category} | ${item.name} | ${item.status} | ${(item.expected || []).join('；').replace(/\|/g, '\\|')} |`);
}
lines.push('', '## 判定边界', '', '- “待运行”表示场景、样本和测试证据都存在，但本次没有对应 Jest 运行结果。', '- “通过”表示对应故障实验套件本次执行成功；它不等于真实硬盘、同步软件或外部 AI 厂商的所有故障都已被穷举。', '- 动态故障由测试边界注入，业务源码不得包含故障实验室专用分支。');
fs.writeFileSync(path.join(outputDir, '故障实验室报告.md'), `${lines.join('\n')}\n`);

console.log('\n【故障实验室报告】');
console.log(`- 总体结论：${overall}`);
console.log(`- 场景：${report.counts.total}，通过 ${report.counts.passed}，失败 ${report.counts.failed}，待运行 ${report.counts.pending}`);
console.log('- 报告：reports/testing/fault-lab/故障实验室报告.md');
