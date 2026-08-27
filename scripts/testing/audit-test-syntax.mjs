#!/usr/bin/env node
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require('typescript');
} catch {
  console.error('\n【测试语法审计】无法加载 TypeScript。');
  console.error('【测试语法审计】请先安装项目依赖（npm ci），再执行本审计。');
  process.exit(2);
}

const roots = ['test', 'scripts/testing'];
const tsFiles = [];
const jsFiles = [];
const failures = [];

function walk(relativeDir) {
  const absoluteDir = path.resolve(relativeDir);
  if (!fs.existsSync(absoluteDir)) return;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const absolute = path.join(absoluteDir, entry.name);
    const relative = path.relative(process.cwd(), absolute).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      walk(relative);
      continue;
    }
    if (/\.(?:ts|tsx|mts)$/.test(entry.name)) tsFiles.push(relative);
    if (/\.(?:js|mjs|cjs)$/.test(entry.name)) jsFiles.push(relative);
  }
}

for (const root of roots) walk(root);
walk('test/configs');

for (const file of tsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      jsxImportSource: 'preact',
    },
  });
  for (const diagnostic of result.diagnostics || []) {
    if (diagnostic.category !== ts.DiagnosticCategory.Error) continue;
    let location = '';
    if (diagnostic.file && diagnostic.start != null) {
      const pos = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      location = `:${pos.line + 1}:${pos.character + 1}`;
    }
    failures.push(`${file}${location}：${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
  }
}

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) failures.push(`${file}：JavaScript 语法检查失败（具体解析信息请直接用 node --check 查看）`);
}

console.log('\n【测试语法审计】');
console.log(`- TypeScript / TSX / MTS：${tsFiles.length} 个文件`);
console.log(`- JavaScript / MJS / CJS：${jsFiles.length} 个文件`);
if (failures.length) {
  console.error(`- 结果：失败，共 ${failures.length} 个语法问题`);
  for (const item of failures.slice(0, 80)) console.error(`  - ${item}`);
  if (failures.length > 80) console.error(`  - ……其余 ${failures.length - 80} 项请修复后重跑。`);
  process.exit(1);
}
console.log('- 结果：通过');
