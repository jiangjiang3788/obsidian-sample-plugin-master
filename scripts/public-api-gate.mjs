#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/**
 * Public API Gate (zero-deps)
 * 目标：
 *  - core/public.ts 只允许 export* 从模块级 barrel（./types ./utils ./ai）
 *  - core/utils/index.ts 的 export* 不允许产生命名冲突
 *  - 非 core 层禁止 deep import core（只能 import '@core/public'）
 *
 * 检测方式：
 *  - export/import 正则 + 模块路径真实落点解析（部分）
 *  - 去注释/去字符串以减少误报
 */

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

const CORE_PUBLIC = path.join(SRC, 'core', 'public.ts');
const UTILS_INDEX = path.join(SRC, 'core', 'utils', 'index.ts');

// ---- Config (可调) ----
const ALLOW_CORE_PUBLIC_EXPORT_STAR = new Set(['./types', './utils', './ai']);

// 允许 core 外部 import 的唯一入口
const CORE_FACADE_IMPORT = '@core/public';

// 支持的 “绕过门面” import 前缀（你项目里同时存在 @/core 和 @core/xxx）
const CORE_DEEP_PREFIX_RE = /(^@\/core\/)|(^@core\/(?!public\b))/;

// 扫描扩展名
const SCAN_EXTS = ['.ts', '.tsx', '.js', '.jsx'];

// ---- Helpers ----
function rel(p) {
  return path.relative(ROOT, p).replaceAll('\\', '/');
}
function read(p) {
  return fs.readFileSync(p, 'utf8');
}
function existsFile(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/** 粗略去掉注释 + 字符串，减少 “注释里提到 tsyringe/core” 误报 */
function stripNoise(code) {
  // 1) 去 block comments
  let s = code.replace(/\/\*[\s\S]*?\*\//g, ' ');
  // 2) 去 line comments
  s = s.replace(/(^|[^:])\/\/.*$/gm, '$1 ');
  // 3) 去单/双引号字符串
  s = s.replace(/'([^'\\]|\\.)*'/g, "''");
  s = s.replace(/"([^"\\]|\\.)*"/g, '""');
  // 4) 去模板字符串（保留结构）
  s = s.replace(/`([^`\\]|\\.)*`/g, '``');
  return s;
}

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, exts, out);
    else if (exts.some((x) => full.endsWith(x))) out.push(full);
  }
  return out;
}

function collectExportStarTargets(fileText) {
  const targets = [];
  const re = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(fileText))) targets.push(m[1]);
  return targets;
}

function collectNamedExports(fileText) {
  const exports = [];
  const re = /export\s*\{\s*([^}]+)\s*\}\s*from\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(fileText))) {
    const names = m[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.split(/\s+as\s+/)[0].trim());
    exports.push(...names);
  }
  return exports;
}

function collectDirectExports(fileText) {
  const names = [];
  const re =
    /export\s+(?:async\s+)?(?:function|const|let|var|class|type|interface|enum)\s+([A-Za-z0-9_]+)/g;
  let m;
  while ((m = re.exec(fileText))) names.push(m[1]);
  return names;
}

function resolveModuleFile(fromFile, source) {
  // 只解析相对路径 barrel：./xxx
  if (!source.startsWith('.')) return null;

  const base = path.join(path.dirname(fromFile), source);
  const tryList = [
    base,
    base + '.ts',
    base + '.tsx',
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  for (const p of tryList) {
    if (existsFile(p)) return p;
  }
  return null;
}

function fmt(rule, message, detail = '') {
  return {
    rule,
    message,
    detail,
  };
}

function printViolations(title, violations) {
  console.error(`\n❌ ${title} failed:\n`);
  for (const v of violations) {
    console.error(`- [${v.rule}] ${v.message}`);
    if (v.detail) console.error(`  ${v.detail}`);
    console.error('');
  }
}

function main() {
  const violations = [];

  // A) core/public.ts 约束：只允许从模块级 barrel export *
  if (!existsFile(CORE_PUBLIC)) {
    violations.push(
      fmt(
        'PUB-000',
        `缺少 ${rel(CORE_PUBLIC)}（Public Facade 必须存在）`,
        `修复：创建 core/public.ts 并作为 core 唯一出口`
      )
    );
  } else {
    const publicText = read(CORE_PUBLIC);
    const stars = collectExportStarTargets(publicText);

    for (const t of stars) {
      if (!ALLOW_CORE_PUBLIC_EXPORT_STAR.has(t)) {
        violations.push(
          fmt(
            'PUB-001',
            `${rel(CORE_PUBLIC)} 禁止 export * from '${t}'`,
            `只允许：${[...ALLOW_CORE_PUBLIC_EXPORT_STAR].join(' ')}；其他请改为显式 export { ... }`
          )
        );
      }
    }
  }

  // B) utils/index.ts 检测 export* 冲突
  if (existsFile(UTILS_INDEX)) {
    const utilsText = read(UTILS_INDEX);
    const utilsStars = collectExportStarTargets(utilsText);

    const exportMap = new Map(); // name -> [module...]
    for (const src of utilsStars) {
      const modFile = resolveModuleFile(UTILS_INDEX, src);
      if (!modFile) continue;

      const txt = read(modFile);
      const names = [...collectDirectExports(txt), ...collectNamedExports(txt)];

      for (const n of names) {
        if (!exportMap.has(n)) exportMap.set(n, []);
        exportMap.get(n).push(rel(modFile));
      }
    }

    for (const [name, modules] of exportMap.entries()) {
      if (modules.length > 1) {
        violations.push(
          fmt(
            'PUB-002',
            `${rel(UTILS_INDEX)} export * 冲突：'${name}' 同时来自 ${modules.length} 个模块`,
            `冲突来源：\n    - ${modules.join('\n    - ')}\n修复：改名加领域前缀 / 或停止从 utils/index.ts 导出其中一个`
          )
        );
      }
    }
  }

  // C) 禁止非 core 层 deep import core（必须走 @core/public）
  const files = walk(path.join(ROOT, 'src'), SCAN_EXTS);

  // import ... from "xxx" / export ... from "xxx" / import("xxx")
  const reModule =
    /\b(?:import|export)\b[\s\S]*?\bfrom\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const f of files) {
    const r = rel(f);
    if (r.startsWith('src/core/')) continue;

    const raw = read(f);
    const t = stripNoise(raw);

    let m;
    while ((m = reModule.exec(t))) {
      const source = m[1] || m[2];
      if (!source) continue;

      // 允许 core facade
      if (source === CORE_FACADE_IMPORT) continue;

      // 命中 deep import core
      if (CORE_DEEP_PREFIX_RE.test(source)) {
        violations.push(
          fmt(
            'PUB-003',
            `禁止绕过门面：${r} 出现 core 深层 import → '${source}'`,
            `修复：只能 import '${CORE_FACADE_IMPORT}'（必要导出请加到 core/public.ts）`
          )
        );
      }
    }
  }

  if (violations.length) {
    printViolations('Public API Gate', violations);
    process.exit(1);
  }

  console.log('✅ public-api-gate passed.');
}

main();
