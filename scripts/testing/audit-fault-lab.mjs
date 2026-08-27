#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const manifestPath = path.join(root, 'test/system/fault-lab.json');
const featureMapPath = path.join(root, 'test/system/feature-test-map.json');
const problems = [];

function fail(message) { problems.push(message); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

if (!fs.existsSync(manifestPath)) {
  console.error('\n【故障实验室审计】缺少 test/system/fault-lab.json。');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const featureMap = JSON.parse(fs.readFileSync(featureMapPath, 'utf8'));
const featureIds = new Set((featureMap.features || []).map((item) => item.id));
const allowedGroups = new Set(['data', 'transaction', 'restart', 'storage', 'ai', 'scale']);
const ids = new Set();
const groups = new Map();

if (manifest.version !== 'v9') fail(`故障实验室版本应为 v9，当前为 ${String(manifest.version || '未设置')}`);
if (!Array.isArray(manifest.scenarios) || manifest.scenarios.length < 15) fail('故障场景少于 15 个，无法覆盖数据、事务、AI、规模等主要异常面。');

for (const scenario of manifest.scenarios || []) {
  if (!/^FL-[A-Z]+-\d{3}$/.test(String(scenario.id || ''))) fail(`故障编号格式非法：${String(scenario.id)}`);
  if (ids.has(scenario.id)) fail(`故障编号重复：${scenario.id}`);
  ids.add(scenario.id);
  if (!/[\u3400-\u9fff]/.test(String(scenario.name || ''))) fail(`${scenario.id} 场景名称必须包含中文。`);
  if (!['P0', 'P1', 'P2'].includes(scenario.risk)) fail(`${scenario.id} 风险等级非法：${scenario.risk}`);
  if (!allowedGroups.has(scenario.runGroup)) fail(`${scenario.id} 运行分组非法：${scenario.runGroup}`);
  groups.set(scenario.runGroup, (groups.get(scenario.runGroup) || 0) + 1);
  if (!Array.isArray(scenario.expected) || scenario.expected.length < 2) fail(`${scenario.id} 至少需要 2 条明确恢复/隔离预期。`);
  if (!Array.isArray(scenario.evidence) || scenario.evidence.length === 0) fail(`${scenario.id} 没有自动化证据。`);
  for (const fixture of scenario.fixtures || []) {
    if (!fixture.startsWith('test/fixtures/fault-lab/')) fail(`${scenario.id} 固定样本必须位于 test/fixtures/fault-lab/：${fixture}`);
    if (!exists(fixture)) fail(`${scenario.id} 固定样本不存在：${fixture}`);
  }
  for (const evidence of scenario.evidence || []) {
    if (!exists(evidence)) { fail(`${scenario.id} 测试证据不存在：${evidence}`); continue; }
    const text = read(evidence);
    if (!text.includes(`@fault ${scenario.id}`)) fail(`${scenario.id} 证据缺少显式 @fault 声明：${evidence}`);
    if (!/\b(?:describe|it|test)(?:\.each)?\s*\(/.test(text)) fail(`${scenario.id} 证据文件没有测试用例：${evidence}`);
  }
  for (const featureId of scenario.covers || []) {
    if (!featureIds.has(featureId)) fail(`${scenario.id} 引用了不存在的功能编号：${featureId}`);
  }
}

for (const required of ['data', 'transaction', 'storage', 'ai', 'scale']) {
  if (!groups.get(required)) fail(`故障实验室缺少 ${required} 分组。`);
}

const trackedFixtures = new Set((manifest.scenarios || []).flatMap((scenario) => scenario.fixtures || []));
const fixtureDir = path.join(root, 'test/fixtures/fault-lab/markdown');
if (fs.existsSync(fixtureDir)) {
  for (const name of fs.readdirSync(fixtureDir)) {
    if (!name.endsWith('.md')) continue;
    const rel = `test/fixtures/fault-lab/markdown/${name}`;
    if (!trackedFixtures.has(rel)) fail(`固定样本没有登记到任何故障场景：${rel}`);
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const command of ['测试:故障实验室:审计', '测试:故障实验室', '测试:故障实验室:报告']) {
  if (!pkg.scripts?.[command]) fail(`package.json 缺少中文命令：${command}`);
}

console.log('\n【故障实验室审计】');
console.log(`- 固定/动态故障场景：${manifest.scenarios?.length || 0} 个`);
console.log(`- P0：${(manifest.scenarios || []).filter((item) => item.risk === 'P0').length} 个`);
console.log(`- P1：${(manifest.scenarios || []).filter((item) => item.risk === 'P1').length} 个`);
const groupSummary = [...groups.entries()].map(([group, count]) => group + '=' + count).join('，');
console.log(`- 运行分组：${groupSummary}`);
if (problems.length) {
  console.error(`- 结果：失败，共 ${problems.length} 个问题`);
  for (const item of problems.slice(0, 80)) console.error(`  - ${item}`);
  if (problems.length > 80) console.error(`  - ……其余 ${problems.length - 80} 项请修复后重跑。`);
  process.exit(1);
}
console.log('- 样本路径、场景编号、功能引用、@fault 证据：全部可追溯');
console.log('- 结果：通过');
