#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Core Obsidian Import Gate (freeze expansion)
// ---------------------------------------------------------------------------
// 目标：Phase2 迁移期间“冻结扩散”——禁止 core 新增 obsidian 依赖。
// - 允许列表（allowlist）中的 core 文件可以暂时 import 'obsidian'
// - 其它任何 core 文件一旦 import 'obsidian'，立即 fail
//
// 说明：
// - 这是一个过渡期门禁（Phase2 期间用）。
// - 当 core 完全去 obsidian 依赖后，allowlist 应逐步清空，并最终将 gate 升级为 "core import obsidian = 0"。

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

import { failWithViolations, printOk } from './gate-formatter.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const ROOT = process.cwd();
const CORE_DIR = path.join(ROOT, 'src', 'core');
const ALLOWLIST_PATH = path.join(ROOT, 'scripts', 'core-obsidian-gate.allowlist.json');

function rel(p) {
  return path.relative(ROOT, p).replaceAll('\\', '/');
}

function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) return new Set();
  try {
    const json = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
    const arr = Array.isArray(json) ? json : Array.isArray(json?.allow) ? json.allow : [];
    return new Set(arr.filter((x) => typeof x === 'string').map((s) => s.trim()).filter(Boolean));
  } catch {
    return new Set();
  }
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx|mts|cts)$/.test(e.name)) out.push(full);
  }
  return out;
}

function getScriptKind(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  if (ext === '.ts') return ts.ScriptKind.TS;
  if (ext === '.tsx') return ts.ScriptKind.TSX;
  if (ext === '.js') return ts.ScriptKind.JS;
  if (ext === '.jsx') return ts.ScriptKind.JSX;
  if (ext === '.mts') return ts.ScriptKind.TS;
  if (ext === '.cts') return ts.ScriptKind.TS;
  return ts.ScriptKind.Unknown;
}

function extractObsidianImports(sourceFile) {
  /** @type {{ spec: string, pos: number, kind: string }[]} */
  const specs = [];

  /** @param {any} node */
  function visit(node) {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specs.push({ spec: node.moduleSpecifier.text, pos: node.moduleSpecifier.getStart(sourceFile), kind: 'import' });
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specs.push({ spec: node.moduleSpecifier.text, pos: node.moduleSpecifier.getStart(sourceFile), kind: 'export' });
    }
    if (ts.isCallExpression(node) && node.expression && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const arg0 = node.arguments && node.arguments[0];
      if (arg0 && ts.isStringLiteral(arg0)) {
        specs.push({ spec: arg0.text, pos: arg0.getStart(sourceFile), kind: 'import()' });
      }
    }
    if (ts.isCallExpression(node) && node.expression && ts.isIdentifier(node.expression) && node.expression.escapedText === 'require') {
      const arg0 = node.arguments && node.arguments[0];
      if (arg0 && ts.isStringLiteral(arg0)) {
        specs.push({ spec: arg0.text, pos: arg0.getStart(sourceFile), kind: 'require()' });
      }
    }
    if (ts.isImportEqualsDeclaration(node)) {
      const ref = node.moduleReference;
      if (ref && ts.isExternalModuleReference(ref) && ref.expression && ts.isStringLiteral(ref.expression)) {
        specs.push({ spec: ref.expression.text, pos: ref.expression.getStart(sourceFile), kind: 'import=' });
      }
    }
    if (ts.isImportTypeNode(node)) {
      const arg = node.argument;
      if (arg && ts.isLiteralTypeNode(arg) && ts.isStringLiteral(arg.literal)) {
        specs.push({ spec: arg.literal.text, pos: arg.literal.getStart(sourceFile), kind: 'import-type' });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specs.filter((x) => x.spec === 'obsidian');
}

function formatLoc(sourceFile, pos) {
  try {
    const lc = ts.getLineAndCharacterOfPosition(sourceFile, pos);
    return `${lc.line + 1}:${lc.character + 1}`;
  } catch {
    return '?:?';
  }
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
  if (!fs.existsSync(CORE_DIR)) {
    console.log('✅ Core Obsidian Gate 通过（未发现 src/core 目录）');
    process.exit(0);
  }

  const allow = loadAllowlist();
  const files = walk(CORE_DIR);

  /** @type {{ file: string, loc: string, kind: string }[]} */
  const offenders = [];
  /** @type {Set<string>} */
  const importing = new Set();

  for (const abs of files) {
    const text = fs.readFileSync(abs, 'utf8');
    const sourceFile = ts.createSourceFile(abs, text, ts.ScriptTarget.Latest, true, getScriptKind(abs));
    const obsSpecs = extractObsidianImports(sourceFile);
    if (!obsSpecs.length) continue;

    importing.add(rel(abs));

    for (const s of obsSpecs) {
      offenders.push({ file: rel(abs), loc: formatLoc(sourceFile, s.pos), kind: s.kind });
    }
  }

  const violations = [];

  for (const o of offenders) {
    if (!allow.has(o.file)) {
      violations.push(
        fmt(
          'CORE-OBS-001',
          `${o.file}:${o.loc} 不允许 import 'obsidian'（冻结扩散门禁）`,
          `修复：将 Obsidian API 访问移到 platform 层或 app 组合根；或（过渡期）把该文件加入 allowlist：scripts/core-obsidian-gate.allowlist.json`
        )
      );
    }
  }

  // optional: 提示 allowlist 中已经不再 import obsidian 的条目（不阻断）
  const stale = Array.from(allow).filter((p) => !importing.has(p));

  if (violations.length) {
    failWithViolations('core-obsidian-gate', violations.map((v) => ({
      file: path.join(ROOT, v.message.split(':')[0]),
      loc: (v.message.match(/:(\d+:\d+)/) || [,'0:0'])[1],
      message: `${v.rule} ${v.message.split(' ').slice(1).join(' ')}`.trim(),
      hint: v.detail,
    })), { rootDir: ROOT, summary: 'core 层禁止直接 import obsidian' });
  }

  printOk('core-obsidian-gate', `当前 core import obsidian 文件数：${importing.size}`);
  if (stale.length) {
    console.log(`[core-obsidian-gate] allowlist 可收敛：以下条目已不再 import obsidian（建议移除）`);
    for (const p of stale) console.log(`[core-obsidian-gate] ${p}:0:0 - stale allowlist candidate`);
  }
}

main();
