// fix-imports.mjs  —— 纯 Node，无外部依赖
import fs from 'fs';
import path from 'path';

const mapping = JSON.parse(fs.readFileSync('moved-paths.json', 'utf8'));
const exts = new Set(['.ts', '.tsx', '.js', '.jsx']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (exts.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

for (const file of walk('src')) {
  let txt = fs.readFileSync(file, 'utf8');
  let changed = false;

  for (const [oldPath, newPath] of Object.entries(mapping)) {
    const re = new RegExp(`(['"\`])${oldPath}\\1`, 'g');
    if (re.test(txt)) {
      txt = txt.replace(re, `$1${newPath}$1`);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, txt, 'utf8');
    console.log('✔️  fixed:', path.relative('.', file));
  }
}

console.log('\n✅ 批量替换完成，重新编译以验证。');