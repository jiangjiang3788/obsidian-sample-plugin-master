#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { publicTestTitle, readJsonSafe, writeJson } from './history-utils.mjs';
import { jestInvocation } from './process-launch.mjs';

const config = readJsonSafe(path.resolve('test/system/test-governance.json'), {});
const repeatsArg = process.argv.find((item) => item.startsWith('--repeat='));
const repeats = Math.max(2, Number(repeatsArg?.split('=')[1] || config.stability?.jestRepeat || 3));
const outDir = path.resolve('reports/testing/stability/jest');
fs.mkdirSync(outDir, { recursive: true });

function runRound(round) {
  return new Promise((resolve) => {
    const structured = path.join(outDir, `第${round}轮-结构化结果.json`);
    const raw = path.join(outDir, `第${round}轮-技术日志.txt`);
    const zh = path.join(outDir, `第${round}轮-中文结果.txt`);
    const fail = path.join(outDir, `第${round}轮-失败技术日志.txt`);
    const invocation = jestInvocation(['--config', 'test/configs/jest.core.config.js', '--runInBand']);
    if (!invocation.exists) {
      fs.writeFileSync(raw, '没有找到 Jest，请先运行 npm ci。');
      resolve({ round, code: 1, structured: null, spawnError: true });
      return;
    }
    const child = spawn(invocation.command, invocation.args, {
      stdio: ['ignore', 'pipe', 'pipe'], shell: false,
      env: { ...process.env, THINK_JEST_STRUCTURED_FILE: structured, THINK_JEST_REPORT_FILE: zh, THINK_JEST_FAILURE_FILE: fail, THINK_TEST_LABEL: `稳定性审计第 ${round} 轮` },
    });
    let technical = '';
    child.stdout?.on('data', (chunk) => { technical += chunk.toString(); });
    child.stderr?.on('data', (chunk) => { technical += chunk.toString(); });
    child.on('error', (error) => {
      fs.writeFileSync(raw, `${technical}\n${String(error?.stack || error)}`);
      resolve({ round, code: 1, structured: null, spawnError: true });
    });
    child.on('exit', (code, signal) => {
      fs.writeFileSync(raw, technical);
      resolve({ round, code: signal ? 1 : (code ?? 1), structured: fs.existsSync(structured) ? readJsonSafe(structured, null) : null });
    });
  });
}

console.log(`\n【稳定性审计】开始重复运行单元/组合测试，共 ${repeats} 轮。`);
console.log('【稳定性审计】第三方英文技术输出只保存到技术日志。');
const rounds = [];
for (let round = 1; round <= repeats; round += 1) {
  console.log(`【稳定性审计】执行第 ${round}/${repeats} 轮……`);
  const result = await runRound(round);
  rounds.push(result);
  console.log(`【稳定性审计】第 ${round} 轮：${result.code === 0 ? '通过' : '失败'}`);
}

const byId = new Map();
for (const round of rounds) {
  for (const item of round.structured?.cases || []) {
    const row = byId.get(item.id) || { id: item.id, file: item.file, title: item.title, outcomes: [] };
    row.outcomes.push({ round: round.round, status: item.status, durationMs: item.durationMs });
    byId.set(item.id, row);
  }
}
const evaluated = [...byId.values()].map((row) => {
  const statuses = new Set(row.outcomes.map((item) => item.status));
  const missingRounds = repeats - row.outcomes.length;
  let classification = '稳定通过';
  if (missingRounds > 0 || (statuses.has('通过') && statuses.has('失败'))) classification = '疑似不稳定';
  else if (statuses.has('失败')) classification = '稳定失败';
  else if (statuses.has('跳过')) classification = '包含跳过';
  return { ...row, missingRounds, classification };
});
const flaky = evaluated.filter((row) => row.classification === '疑似不稳定');
const failed = evaluated.filter((row) => row.classification === '稳定失败');
const roundsFailed = rounds.filter((row) => row.code !== 0).length;
const summary = { schemaVersion: 1, repeats, roundsFailed, totalCases: evaluated.length, flaky, failed, cases: evaluated, generatedAt: new Date().toISOString() };
writeJson(path.join(outDir, '稳定性审计.json'), summary);

const lines = [
  '# Think OS Jest 不稳定测试审计', '',
  `- 重复轮数：${repeats}`,
  `- 发现用例：${evaluated.length}`,
  `- 疑似不稳定：${flaky.length}`,
  `- 稳定失败：${failed.length}`,
  `- 失败轮次：${roundsFailed}`, '',
  '## 疑似不稳定用例', '',
  '| 文件 | 用例 | 各轮结果 |', '|---|---|---|',
];
for (const row of flaky) lines.push(`| ${row.file} | ${publicTestTitle(row.title).replace(/\|/g, '\\|')} | ${row.outcomes.map((x) => `第${x.round}轮:${x.status}`).join('；')} |`);
if (!flaky.length) lines.push('| — | 未发现 | — |');
lines.push('', '## 稳定失败用例', '', '| 文件 | 用例 |', '|---|---|');
for (const row of failed) lines.push(`| ${row.file} | ${publicTestTitle(row.title).replace(/\|/g, '\\|')} |`);
if (!failed.length) lines.push('| — | 未发现 |');
fs.writeFileSync(path.join(outDir, '稳定性审计.md'), `${lines.join('\n')}\n`);

console.log('\n【稳定性审计】结果');
console.log(`- 疑似不稳定：${flaky.length}`);
console.log(`- 稳定失败：${failed.length}`);
console.log('- 报告：reports/testing/stability/jest/稳定性审计.md');
if (flaky.length || failed.length || roundsFailed) process.exit(1);
console.log('- 结论：通过');
