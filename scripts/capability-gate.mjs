#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/**
 * Capability Gate (zero-deps)
 * 目标：
 *  - capability 文件不能变 barrel/index（禁止 export *）
 *  - capability 必须显式导出 createXxxCapability(...) + XxxCapability(type/interface)
 *  - 禁止导出实现物（class/const/enum）
 *  - export 数量限制，防止 capability 变垃圾桶
 *
 * 检测方式：
 *  - 正则（去注释/去字符串以减少误报）
 */

const ROOT = process.cwd();
const CAPS_DIR = path.join(ROOT, 'src', 'app', 'capabilities', 'capabilities');

// ---- Config (可调) ----
const MAX_EXPORT_COUNT = 4; // create + Capability + (少量 type)
const SCAN_EXTS = ['.ts'];

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

function stripNoise(code) {
  let s = code.replace(/\/\*[\s\S]*?\*\//g, ' ');
  s = s.replace(/(^|[^:])\/\/.*$/gm, '$1 ');
  s = s.replace(/'([^'\\]|\\.)*'/g, "''");
  s = s.replace(/"([^"\\]|\\.)*"/g, '""');
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

function fmt(rule, message, detail = '') {
  return { rule, message, detail };
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

  if (!fs.existsSync(CAPS_DIR)) {
    violations.push(
      fmt(
        'CAP-000',
        `缺少 capabilities 目录：${rel(CAPS_DIR)}`,
        `修复：创建 src/app/capabilities/capabilities 并把每个能力放在独立文件里`
      )
    );
    printViolations('Capability Gate', violations);
    process.exit(1);
  }

  const files = walk(CAPS_DIR, SCAN_EXTS);

  for (const f of files) {
    if (!existsFile(f)) continue;

    const raw = read(f);
    const t = stripNoise(raw);
    const r = rel(f);

    // 1) 禁止 export *（capability 不能变 utils/index.ts）
    if (/export\s+\*\s+from\s+['"]/.test(t)) {
      violations.push(
        fmt(
          'CAP-001',
          `${r} 禁止使用 "export * from ..."`,
          `修复：capability 只能显式导出 create+Capability(type/interface)`
        )
      );
    }

    // 2) 禁止导出实现物（class/const/enum）
    if (/\bexport\s+class\s+/.test(t)) {
      violations.push(
        fmt(
          'CAP-002',
          `${r} 禁止导出 class`,
          `修复：实现必须隐藏在 app/usecases 或 core/services；capability 只导出合同+工厂`
        )
      );
    }
    if (/\bexport\s+(const|let|var)\s+/.test(t)) {
      violations.push(
        fmt(
          'CAP-003',
          `${r} 禁止导出 const/let/var`,
          `修复：不要把 helper/常量塞进 capability；放到 core/utils 或 app/usecases 内部`
        )
      );
    }
    if (/\bexport\s+enum\s+/.test(t)) {
      violations.push(
        fmt(
          'CAP-004',
          `${r} 禁止导出 enum`,
          `修复：enum 放到 core/types 或 app/usecases`
        )
      );
    }

    // 3) 必须存在 createXxxCapability 工厂函数
    if (!/\bexport\s+function\s+create[A-Za-z0-9_]*Capability\s*\(/.test(t)) {
      violations.push(
        fmt(
          'CAP-005',
          `${r} 必须导出 createXxxCapability(...) 工厂函数`,
          `修复：export function createXxxCapability(deps): XxxCapability { ... }`
        )
      );
    }

    // 4) 必须导出 XxxCapability type/interface（能力合同）
    if (!/\bexport\s+(type|interface)\s+[A-Za-z0-9_]*Capability\b/.test(t)) {
      violations.push(
        fmt(
          'CAP-006',
          `${r} 必须导出 XxxCapability 的 type/interface（能力合同）`,
          `修复：export type XxxCapability = { ... } 或 export interface XxxCapability { ... }`
        )
      );
    }

    // 5) 限制导出数量，防止 capability 垃圾桶化
    const exportCount =
      (t.match(/\bexport\s+function\b/g) || []).length +
      (t.match(/\bexport\s+(type|interface)\b/g) || []).length +
      (t.match(/\bexport\s+(const|let|var)\b/g) || []).length +
      (t.match(/\bexport\s+class\b/g) || []).length +
      (t.match(/\bexport\s+enum\b/g) || []).length;

    if (exportCount > MAX_EXPORT_COUNT) {
      violations.push(
        fmt(
          'CAP-007',
          `${r} export 数量过多（${exportCount} > ${MAX_EXPORT_COUNT}）`,
          `修复：capability 只保留 create+Capability(+少量 type)，其余移到内部实现/类型模块`
        )
      );
    }
  }

  if (violations.length) {
    printViolations('Capability Gate', violations);
    process.exit(1);
  }

  console.log('✅ capability-gate passed.');
}

main();
