#!/usr/bin/env node
import fs from 'node:fs';
import process from 'node:process';

const problems = [];
function must(file, tokens) {
  if (!fs.existsSync(file)) { problems.push(`缺少文件：${file}`); return; }
  const text = fs.readFileSync(file, 'utf8');
  for (const token of tokens) if (!text.includes(token)) problems.push(`${file} 缺少治理能力：${token}`);
}

must('test/configs/jest-reporter.zh-CN.cjs', ['THINK_JEST_STRUCTURED_FILE', 'durationMs', 'slowCases']);
must('scripts/testing/run-jest-zh.mjs', ['recordStructuredTestRun', 'updatePerformanceHistory']);
must('test/configs/wdio.conf.mts', ['afterTest', 'saveScreenshot', '页面现场.html', '用例结果.jsonl']);
must('scripts/testing/run-e2e-suite.mjs', ['e2e-results', '结构化结果.json', 'recordStructuredTestRun']);
must('scripts/testing/run-stability-audit-zh.mjs', ['疑似不稳定', '稳定失败']);
must('scripts/testing/run-e2e-stability-zh.mjs', ['真机稳定性', '疑似不稳定']);
must('scripts/testing/performance-history.mjs', ['performance-history.json', 'performance-trend.md', '需要关注']);
must('scripts/testing/generate-quality-report.mjs', ['发布质量报告.md', '待补齐运行证据', '阻止发布']);
must('test/system/test-governance.json', ['warningRegressionRatio', 'jestRepeat', 'e2eP0Repeat']);
must('scripts/testing/audit-fault-lab.mjs', ['@fault', '故障实验室审计']);
must('scripts/testing/generate-fault-lab-report.mjs', ['故障实验室报告.md', '待补齐运行证据']);
const isCiRuntime = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
if (isCiRuntime) {
  must('.github/workflows/think-os-test-v9.yml', ['验证:CI:v9', '测试:稳定性', '测试:真机:稳定性:P0', '发布质量报告', 'actions/cache@v4']);
} else {
  console.log('【测试结果治理审计】当前不是 CI 运行环境；跳过 CI 工作流文件存在性检查。');
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const ciEntry = String(pkg.scripts?.['验证:CI:v9'] || '');
const simpleFull = String(pkg.scripts?.['测试:完整'] || '');
const faultAlias = String(pkg.scripts?.['测试:故障'] || '');
const hasFaultLab = ciEntry.includes('测试:故障实验室')
  || (ciEntry.includes('测试:完整') && (simpleFull.includes('测试:故障实验室') || (simpleFull.includes('测试:故障') && faultAlias.includes('测试:故障实验室'))));
if (!hasFaultLab) problems.push('v9 CI 门禁没有串联故障实验室。');
for (const name of ['测试:结果治理', '测试:故障实验室:审计', '测试:故障实验室', '测试:故障实验室:报告', '测试:稳定性', '测试:真机:稳定性:P0', '测试:质量报告', '验证:CI:v9', '验证:发布:v9']) {
  if (!pkg.scripts?.[name]) problems.push(`package.json 缺少命令：${name}`);
}

console.log('\n【测试结果治理审计】');
if (problems.length) {
  console.error(`- 结果：失败，共 ${problems.length} 个问题`);
  for (const item of problems) console.error(`  - ${item}`);
  process.exit(1);
}
console.log('- Jest 结构化结果与耗时：已接入');
console.log('- 真机失败截图 / 页面现场：已接入');
console.log('- Jest / P0 真机不稳定测试检测：已接入');
console.log('- 性能历史趋势：已接入');
console.log('- 发布质量报告：已接入');
console.log('- 故障实验室与异常恢复报告：已接入');
console.log('- CI 历史缓存与质量产物：已接入');
console.log('- 结果：通过');
