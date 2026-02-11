#!/usr/bin/env node
/**
 * theme-tree-recursion-gate
 *
 * Goal:
 * - 防止 ThemeMatrix（以及类似场景）回退到“递归渲染行组件”（<ThemeTreeNodeRow ...> 自己调用自己）
 * - 推荐做法：使用统一 ThemePathTreeBuilder + flattenThemePathTree 产出可见扁平列表，Table 直接 map 渲染
 *
 * Rule:
 * - src/features/settings/ThemeTreeNodeRow.tsx 里不得出现 JSX tag "<ThemeTreeNodeRow"
 *   （一旦出现基本就是递归渲染回来了）
 */
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const targetFile = path.join(projectRoot, 'src', 'features', 'settings', 'ThemeTreeNodeRow.tsx');

function findLoc(content, idx) {
  const before = content.slice(0, idx);
  const line = before.split(/\r?\n/).length;
  const col = idx - before.lastIndexOf('\n') - 1;
  return `${line}:${col < 0 ? 0 : col}`;
}

const violations = [];

if (!fs.existsSync(targetFile)) {
  console.log('✅ [theme-tree-recursion-gate] OK: target file not found (nothing to check).');
  process.exit(0);
}

const raw = fs.readFileSync(targetFile, 'utf8');

// naive strip block + line comments (avoid false positives from comments)
const code = raw
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

const re = /<\s*ThemeTreeNodeRow\b/g;
const match = re.exec(code);
if (match) {
  violations.push({
    file: targetFile,
    loc: findLoc(raw, match.index),
    message: 'Recursive rendering detected: ThemeTreeNodeRow should not render <ThemeTreeNodeRow ...>.',
    hint: 'Use buildThemePathTree(...)+flattenThemePathTree(...) in ThemeMatrixView, then Table.map rows (no recursion).',
  });
}

if (violations.length) {
  console.error('\n❌ [theme-tree-recursion-gate] Recursive ThemeTreeNodeRow rendering is not allowed.');
  for (const v of violations) {
    const rel = path.relative(projectRoot, v.file).replace(/\\/g, '/');
    console.error(`[theme-tree-recursion-gate] ${rel}:${v.loc} - ${v.message}`);
    if (v.hint) console.error(`  hint: ${v.hint}`);
  }
  console.error(`\n❌ [theme-tree-recursion-gate] violations: ${violations.length}`);
  process.exit(1);
}

console.log('✅ [theme-tree-recursion-gate] OK: no recursive ThemeTreeNodeRow rendering');
