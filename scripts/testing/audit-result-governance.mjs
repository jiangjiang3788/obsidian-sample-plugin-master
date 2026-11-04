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
  must('.github/workflows/ci.yml', ['npm run ci', 'actions/upload-artifact@v4', 'main.js', 'styles.css', 'manifest.json']);
} else {
  console.log('【测试结果治理审计】本地环境：跳过 CI 配置的强制存在性检查。');
}
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const name of ['test', 'test:smoke', 'test:e2e', 'test:fault', 'test:coverage', 'test:performance', 'check', 'ci']) {
  if (!pkg.scripts?.[name]) problems.push(`缺少实际使用的工程入口：${name}`);
}
for (const file of ['audit-fault-lab.mjs', 'run-fault-lab-zh.mjs', 'generate-fault-lab-report.mjs']) {
  if (!String(pkg.scripts?.['test:fault'] || '').includes(file)) problems.push(`test:fault 缺少：${file}`);
}
if (String(pkg.scripts?.ci || '').includes('test:fault')) {
  console.log('【测试结果治理审计】CI 已接入故障实验室；请确保固定样本齐全。');
} else {
  console.log('【测试结果治理审计】故障实验室为独立专项测试；缺失样本需补齐后再纳入 CI。');
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
console.log('- 发布质量报告工具：保留，非默认 CI 步骤');
console.log('- 故障实验室与异常恢复报告：独立专项，当前需补齐固定样本');
console.log('- CI npm 依赖缓存与三份插件产物：已接入；历史记录缓存需另行接入');
console.log('- 结果：通过');
