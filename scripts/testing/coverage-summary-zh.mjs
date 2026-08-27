import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('reports/coverage/coverage-summary.json');
if (!fs.existsSync(file)) {
  console.error('【覆盖率】未找到覆盖率汇总文件。');
  process.exit(1);
}
const summary = JSON.parse(fs.readFileSync(file, 'utf8')).total;
const rows = [
  ['语句', summary.statements],
  ['分支', summary.branches],
  ['函数', summary.functions],
  ['代码行', summary.lines],
];
console.log('\n【覆盖率汇总】');
for (const [label, stat] of rows) {
  console.log(`- ${label}：${stat.pct}%（已覆盖 ${stat.covered} / 总计 ${stat.total}）`);
}
console.log(`【覆盖率】HTML 报告：${path.relative(process.cwd(), path.resolve('reports/coverage/index.html'))}`);
