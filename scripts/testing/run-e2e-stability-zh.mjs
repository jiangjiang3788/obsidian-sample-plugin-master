#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { publicTestTitle, readJsonSafe, writeJson } from './history-utils.mjs';
import { npmInvocation } from './process-launch.mjs';

const config = readJsonSafe(path.resolve('test/system/test-governance.json'), {});
const repeatsArg = process.argv.find((item) => item.startsWith('--repeat='));
const repeats = Math.max(2, Number(repeatsArg?.split('=')[1] || config.stability?.e2eP0Repeat || 2));
const outDir = path.resolve('reports/testing/stability/e2e-p0');
fs.mkdirSync(outDir, { recursive: true });

function run(command, args, logFile, env = process.env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false, env });
    let raw = '';
    child.stdout?.on('data', (chunk) => { raw += chunk.toString(); });
    child.stderr?.on('data', (chunk) => { raw += chunk.toString(); });
    child.on('error', (error) => { fs.writeFileSync(logFile, `${raw}\n${String(error?.stack || error)}`); resolve(1); });
    child.on('exit', (code, signal) => { fs.writeFileSync(logFile, raw); resolve(signal ? 1 : (code ?? 1)); });
  });
}

console.log(`\n【真机稳定性】P0 真机流程重复运行 ${repeats} 轮。`);
console.log('【真机稳定性】先构建一次当前源码，随后重复启动真实 Obsidian。');
const npmBuild = npmInvocation(['--silent', 'run', 'build:debug']);
const buildCode = await run(npmBuild.command, npmBuild.args, path.join(outDir, '构建技术日志.txt'));
if (buildCode !== 0) {
  console.error('【真机稳定性】构建失败，未开始重复真机测试。');
  console.error('【真机稳定性】技术日志：reports/testing/stability/e2e-p0/构建技术日志.txt');
  process.exit(1);
}

const rounds = [];
for (let round = 1; round <= repeats; round += 1) {
  console.log(`【真机稳定性】执行第 ${round}/${repeats} 轮……`);
  const code = await run(process.execPath, ['scripts/testing/run-e2e-suite.mjs', 'p0'], path.join(outDir, `第${round}轮-运行层技术日志.txt`));
  const latest = readJsonSafe(path.resolve('reports/testing/e2e-p0-结构化结果.json'), null);
  if (latest) writeJson(path.join(outDir, `第${round}轮-结构化结果.json`), latest);
  rounds.push({ round, code, result: latest });
  console.log(`【真机稳定性】第 ${round} 轮：${code === 0 ? '通过' : '失败'}`);
}

const byId = new Map();
for (const round of rounds) {
  for (const item of round.result?.cases || []) {
    const row = byId.get(item.id) || { id: item.id, title: item.title, parent: item.parent, outcomes: [] };
    row.outcomes.push({ round: round.round, status: item.status, durationMs: item.durationMs });
    byId.set(item.id, row);
  }
}
const cases = [...byId.values()].map((row) => {
  const statuses = new Set(row.outcomes.map((x) => x.status));
  const missingRounds = repeats - row.outcomes.length;
  const flaky = missingRounds > 0 || (statuses.has('通过') && statuses.has('失败'));
  const failed = !flaky && statuses.has('失败');
  return { ...row, missingRounds, classification: flaky ? '疑似不稳定' : failed ? '稳定失败' : '稳定通过' };
});
const flaky = cases.filter((row) => row.classification === '疑似不稳定');
const failed = cases.filter((row) => row.classification === '稳定失败');
const roundsFailed = rounds.filter((row) => row.code !== 0).length;
writeJson(path.join(outDir, '真机稳定性审计.json'), { schemaVersion: 1, repeats, roundsFailed, flaky, failed, cases, generatedAt: new Date().toISOString() });

const lines = ['# Think OS P0 真机不稳定测试审计', '', `- 重复轮数：${repeats}`, `- 疑似不稳定：${flaky.length}`, `- 稳定失败：${failed.length}`, `- 失败轮次：${roundsFailed}`, '', '## 疑似不稳定', '', '| 用例 | 各轮结果 |', '|---|---|'];
for (const row of flaky) lines.push(`| ${publicTestTitle(`${row.parent || ''} > ${row.title}`).replace(/\|/g, '\\|')} | ${row.outcomes.map((x) => `第${x.round}轮:${x.status}`).join('；')} |`);
if (!flaky.length) lines.push('| — | 未发现 |');
fs.writeFileSync(path.join(outDir, '真机稳定性审计.md'), `${lines.join('\n')}\n`);

console.log('\n【真机稳定性】结果');
console.log(`- 疑似不稳定：${flaky.length}`);
console.log(`- 稳定失败：${failed.length}`);
console.log('- 报告：reports/testing/stability/e2e-p0/真机稳定性审计.md');
if (flaky.length || failed.length || roundsFailed) process.exit(1);
console.log('- 结论：通过');
