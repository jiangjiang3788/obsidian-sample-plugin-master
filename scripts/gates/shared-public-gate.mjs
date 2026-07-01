#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { failWithViolations, printOk } from '../lib/gate-formatter.mjs';
import { SHARED_MODULE_PUBLIC_FACADES, SHARED_ROOT_PUBLIC_FACADE, isSharedPublicFacadeSpecifier } from './public-facades.config.mjs';

/**
 * Shared Public API Gate
 * 目标：
 *  - shared 作为“薄出口”，上层只能 import '@shared/public' 或 '@shared/<module>/public'
 *  - 禁止 app/features/core 等对 '@shared/**' / '@/shared/**' 深导入
 */

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

const SHARED_FACADE_IMPORT = SHARED_ROOT_PUBLIC_FACADE;
const SHARED_DEEP_PREFIX_RE = /(^@\/shared\/)|(^@shared\/(?!public\b))/;
const SCAN_EXTS = ['.ts', '.tsx', '.js', '.jsx'];

function rel(p) {
  return path.relative(ROOT, p).replaceAll('\\', '/');
}
function read(p) {
  return fs.readFileSync(p, 'utf8');
}

function stripNoise(code) {
  // 仅移除注释，保留字符串字面量。
  // 之前替换字符串会导致 import 源路径被抹掉，从而漏检。
  let s = code.replace(/\/\*[\s\S]*?\*\//g, ' ');
  s = s.replace(/(^|[^:])\/\/.*$/gm, '$1 ');
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

function fmt(rule, file, msg, detail = '') {
  return { rule, file, msg, detail };
}

function main() {
  const violations = [];

  for (const facade of SHARED_MODULE_PUBLIC_FACADES) {
    if (!fs.existsSync(path.join(ROOT, facade.file))) {
      violations.push(
        fmt(
          'SHP-002',
          facade.file,
          `缺少 shared 模块级 public facade：${facade.file}`,
          `修复：创建 ${facade.file}，并在 public-facades.config.mjs 中保持一致`
        )
      );
    }
  }

  const files = walk(SRC, SCAN_EXTS);
  for (const file of files) {
    const r = rel(file);
    // shared 自己内部允许深导入（逐步收口）
    if (r.startsWith('src/shared/')) continue;

    const code = stripNoise(read(file));
    const importRe = /(?:import\s+[^;]*?from\s+|require\()\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = importRe.exec(code))) {
      const source = m[1];
      if (isSharedPublicFacadeSpecifier(source)) continue;
      if (SHARED_DEEP_PREFIX_RE.test(source)) {
        violations.push(
          fmt(
            'SHP-001',
            r,
            `禁止 deep import shared：'${source}'（必须走 '${SHARED_FACADE_IMPORT}' 或 '@shared/<module>/public'）`,
            `修复：把引用迁移到 '@shared/public' 或 '@shared/<module>/public'（或在对应 public facade 增加 re-export）`
          )
        );
      }
    }
  }

  if (violations.length) {
    failWithViolations('shared-public-gate', violations.map((v) => ({
      rule: v.rule,
      message: `${v.file} - ${v.msg}`,
      detail: v.detail,
    })));
    process.exit(1);
  }

  printOk('shared-public-gate', 'shared deep import 检查通过');
}

main();
