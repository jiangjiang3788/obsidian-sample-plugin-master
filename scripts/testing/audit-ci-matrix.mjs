#!/usr/bin/env node
import fs from 'node:fs';
import process from 'node:process';

const workflow = '.github/workflows/think-os-test-v9.yml';
const problems = [];
const isCiRuntime = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
if (fs.existsSync('.github/workflows/think-os-test-v8.yml')) problems.push('旧 v8 工作流仍然启用，会与 v9 重复执行。');
if (!fs.existsSync(workflow)) {
  if (isCiRuntime) problems.push('缺少 v9 自动测试工作流。');
  else console.log('【CI 测试矩阵审计】当前不是 CI 运行环境；跳过工作流文件检查。');
} else {
  const text = fs.readFileSync(workflow, 'utf8');
  const required = [
    ['严格 CI 门禁', '验证:CI:v9'],
    ['P0 真机', '测试:真机:P0'],
    ['P1 真机', '测试:真机:P1'],
    ['P2 真机', '测试:真机:P2'],
    ['大仓库真机', '测试:真机:大仓库'],
    ['兼容矩阵', '测试:真机:兼容矩阵'],
    ['定时计划', 'schedule:'],
    ['依赖锁定安装', 'npm ci --silent'],
    ['不稳定测试审计', '测试:稳定性'],
    ['P0 真机稳定性', '测试:真机:稳定性:P0'],
    ['历史缓存', 'actions/cache@v4'],
    ['发布质量报告', 'generate-quality-report.mjs'],
  ];
  for (const [label, token] of required) {
    if (!text.includes(token)) problems.push(`${label}没有接入自动工作流。`);
  }
  if (!text.includes('xvfb-run -a')) problems.push('Linux 真机任务没有通过虚拟显示环境启动 Obsidian。');
}


const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const ciEntry = String(pkg.scripts?.['验证:CI:v9'] || '');
const simpleFull = String(pkg.scripts?.['测试:完整'] || '');
const faultAlias = String(pkg.scripts?.['测试:故障'] || '');
const hasFaultLab = ciEntry.includes('测试:故障实验室')
  || (ciEntry.includes('测试:完整') && (simpleFull.includes('测试:故障实验室') || (simpleFull.includes('测试:故障') && faultAlias.includes('测试:故障实验室'))));
if (!hasFaultLab) problems.push('v9 CI 门禁没有串联故障实验室。');

console.log('\n【CI 测试矩阵审计】');
if (problems.length) {
  console.error(`- 结果：失败，共 ${problems.length} 个问题`);
  for (const item of problems) console.error(`  - ${item}`);
  process.exit(1);
}
console.log('- 每次提交：严格测试体系、语法、单元、组合、覆盖率、性能、故障实验室');
console.log('- PR / 提交：真实 Obsidian P0');
console.log('- 主动提交 / 手动触发：真实 Obsidian P1、P2');
console.log('- 每周 / 手动触发：大仓库、Obsidian 兼容矩阵、不稳定测试审计');
console.log('- 测试结果：历史缓存、失败现场与发布质量报告');
console.log('- 结果：通过');
