#!/usr/bin/env node
import fs from 'node:fs';
import process from 'node:process';
const failures = [];
const workflow = '.github/workflows/ci.yml';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!fs.existsSync(workflow)) failures.push(`缺少 CI 工作流：${workflow}`);
else {
  const text = fs.readFileSync(workflow, 'utf8');
  for (const [label, token] of [
    ['推送触发', 'push:'],
    ['拉取请求触发', 'pull_request:'],
    ['锁文件安装', 'npm ci'],
    ['持续集成验证', 'npm run ci'],
    ['插件产物保存', 'actions/upload-artifact@v4'],
    ['插件主文件', 'main.js'],
    ['插件样式', 'styles.css'],
    ['插件元数据', 'manifest.json'],
  ]) if (!text.includes(token)) failures.push(`${label}：缺少 ${token}`);
  if (text.includes('npm run publish:vika')) failures.push('CI 不应自动上传维格表');
}
const ci = String(pkg.scripts?.ci || '');
for (const entry of ['npm run check', 'npm run build']) {
  if (!ci.includes(entry)) failures.push(`ci 缺少 ${entry}`);
}
for (const entry of ['test', 'test:smoke', 'test:e2e', 'check:contracts', 'publish:vika']) {
  if (!pkg.scripts?.[entry]) failures.push(`缺少必要工程入口：${entry}`);
}
console.log('\n【CI 工作流审计】');
if (failures.length) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('- PR / push：质量检查 + 正式构建，归档三份 Obsidian 文件');
console.log('- Vika 云端写操作：必须由开发者手动触发');
console.log('- 真机 E2E：需独立环境，不宣称已在 CI 覆盖');
console.log('- 结果：通过');
