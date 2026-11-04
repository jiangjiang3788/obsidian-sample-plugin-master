#!/usr/bin/env node
// Validate the already-built Obsidian artifacts without rebuilding or uploading.
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const required = ['main.js', 'styles.css', 'manifest.json'];
const fail = (message) => {
  console.error(`[publish:vika] ${message}`);
  process.exit(1);
};
for (const filename of required) {
  if (!existsSync(path.join(root, filename))) fail(`缺少 ${filename}，请先运行 npm run build。`);
}
if (existsSync(path.join(root, 'main.js.map'))) {
  fail('检测到调试模式的 main.js.map。请重新运行 npm run build 后再上传。');
}
const manifest = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
if (manifest.id !== pkg.name || manifest.version !== pkg.version || manifest.main !== 'main.js') {
  fail('manifest.json 与 package.json 的 ID、版本或主文件不一致。');
}
if (statSync(path.join(root, 'main.js')).size < 1000 || statSync(path.join(root, 'styles.css')).size < 100) {
  fail('编译产物大小异常，请重新运行 npm run build。');
}

let newestSource = { name: '', time: 0 };
function inspect(relative) {
  const absolute = path.join(root, relative);
  if (!existsSync(absolute)) return;
  const stat = statSync(absolute);
  if (stat.isDirectory()) {
    for (const name of readdirSync(absolute)) inspect(path.join(relative, name));
  } else if (/\.(?:ts|tsx|js|jsx|css|scss)$/.test(relative) || relative === 'config/vite.config.ts') {
    if (stat.mtimeMs > newestSource.time) newestSource = { name: relative, time: stat.mtimeMs };
  }
}
inspect('src');
inspect('config/vite.config.ts');
const artifactTime = Math.min(statSync(path.join(root, 'main.js')).mtimeMs, statSync(path.join(root, 'styles.css')).mtimeMs);
if (newestSource.time > artifactTime + 1000) {
  fail(`源码 ${newestSource.name} 比构建产物更新；请先运行 npm run build，防止上传旧代码。`);
}
console.log(`[publish:vika] 构建检查通过：Think OS ${manifest.version}，将上传现有三份文件（不重新构建）。`);
