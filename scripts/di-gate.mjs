#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { failWithViolations, printOk } from './gate-formatter.mjs';

/**
 * DI Gate (zero-deps)
 * 目标（Phase 4.5 最硬）：
 *  - src/features/** 和 src/shared/** 禁止使用 tsyringe（任何 import/require/dynamic import）
 *  - 禁止使用 container.resolve/register（即使通过其它方式拿到 container 也不行）
 *  - 禁止 @singleton/@inject 等 DI 装饰器（features/shared 不应持有“业务服务单例权力”）
 *
 * 检测方式：
 *  - import 解析（regex 提取模块 source）
 *  - 正则检测（容器/装饰器）
 *  - 去注释/去字符串减少误报（你项目里很多 “tsyringe” 在注释里）
 *
 * 允许名单（composition root 列表）：
 *  - 这里是“允许使用 tsyringe 的文件白名单”
 *  - 默认只允许 app/core 的 composition root；features/shared 默认不允许（除非你明确加例外）
 */

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

const FEATURES_DIR = path.join(SRC, 'features');
const SHARED_DIR = path.join(SRC, 'shared');

// ---- Config: Composition Root Allowlist (可调) ----
// 这些文件允许使用 tsyringe（通常是 composition root / DI setup）
const ALLOW_TSYRINGE_IN = new Set([
  'src/main.ts',
  'src/app/createServices.ts',
  'src/app/ServiceManager.ts',
  'src/core/di/setupCore.ts',
  // 如果你还有其它 DI setup 文件，加入这里
]);

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

/** 去注释/去字符串：避免注释里写了 “tsyringe” 导致误报 */
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

// ---- Detection Regex ----
// import ... from 'xxx' / export ... from 'xxx' / import('xxx') / require('xxx')
const RE_MODULE =
  /\b(?:import|export)\b[\s\S]*?\bfrom\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

// “使用 tsyringe” 的判定（模块层）
function isTsyringeModule(source) {
  return source === 'tsyringe' || source.startsWith('tsyringe/');
}

// container / decorator 关键字（features/shared 禁止）
const RE_CONTAINER_USE = /\bcontainer\.(resolve|register|registerInstance|registerSingleton)\b/;
const RE_DECORATORS = /@(?:singleton|injectable|scoped|inject)\b/;

function checkFile(filePath, violations) {
  const r = rel(filePath);

  // allowlist：允许（通常不在 features/shared，但为了统一机制仍支持）
  if (ALLOW_TSYRINGE_IN.has(r)) return;

  const raw = read(filePath);
  const t = stripNoise(raw);

  // 1) 禁止引入 tsyringe
  let m;
  while ((m = RE_MODULE.exec(t))) {
    const source = m[1] || m[2] || m[3];
    if (!source) continue;

    if (isTsyringeModule(source)) {
      violations.push(
        fmt(
          'DI-001',
          `${r} 禁止 import/require tsyringe → '${source}'`,
          `修复：features/shared 不允许持有 DI 权力；请把 DI/装配移动到 composition root（${[...ALLOW_TSYRINGE_IN].join(', ')}）并通过 capability/public 暴露能力`
        )
      );
    }
  }

  // 2) 禁止直接使用 container API（即使没 import tsyringe，也不允许）
  if (RE_CONTAINER_USE.test(t)) {
    violations.push(
      fmt(
        'DI-002',
        `${r} 禁止使用 container.*（resolve/register 等）`,
        `修复：仅 composition root 可以 resolve；features/shared 只能拿到已注入好的 capability/service`
      )
    );
  }

  // 3) 禁止 DI 装饰器（@singleton/@inject 等）
  if (RE_DECORATORS.test(t)) {
    violations.push(
      fmt(
        'DI-003',
        `${r} 禁止使用 DI 装饰器（@singleton/@inject...）`,
        `修复：把该“服务/业务类”迁到 app/usecases 或 core/services，再通过 capability 暴露；features 只保留 UI/命令注册`
      )
    );
  }
}

function main() {
  const violations = [];

  const targets = [
    ...walk(FEATURES_DIR, SCAN_EXTS),
    ...walk(SHARED_DIR, SCAN_EXTS),
  ].filter(existsFile);

  for (const f of targets) {
    checkFile(f, violations);
  }

  if (violations.length) {
    failWithViolations('di-gate', violations.map((v) => ({
      file: path.join(ROOT, v.message.split(' ')[0]),
      loc: '0:0',
      message: `${v.rule} ${v.message.substring(v.message.indexOf(' ') + 1)}`.trim(),
      hint: v.detail,
    })), { rootDir: ROOT, summary: 'features/shared 禁止 DI 权力' });
  }

  printOk('di-gate', 'features/shared 未发现 tsyringe/container 违规');\n}

main();
