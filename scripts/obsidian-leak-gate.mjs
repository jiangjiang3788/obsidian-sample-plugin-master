#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Obsidian API Leak Gate (stop bleeding)
// ---------------------------------------------------------------------------
// 目标：除 src/platform/**（+allowlist）外，禁止任何地方 import 'obsidian'
// - platform 层可以直接使用 Obsidian API
// - 其它层只能通过 ports/adapters 间接访问
// - allowlist 用于“祖父条款”：先冻结扩散，再逐步迁移并收敛 allowlist
//
// 验收：allowlist 外命中 `from 'obsidian'`/dynamic import/require/import type/export from 立即 fail 并定位到行列。

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

import { failWithViolations, printOk } from './gate-formatter.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const PLATFORM_DIR = path.join(SRC_DIR, 'platform');
const ALLOWLIST_PATH = path.join(ROOT, 'scripts', 'obsidian-leak-gate.allowlist.json');

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

function extractObsidianSpecs(sourceFile) {
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

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    printOk('obsidian-leak-gate', '未发现 src 目录');
    process.exit(0);
  }

  const allow = loadAllowlist();
  const files = walk(SRC_DIR);

  /** @type {{ file: string, loc: string, kind: string }[]} */
  const offenders = [];
  /** @type {Set<string>} */
  const importing = new Set();

  for (const abs of files) {
    const relPath = rel(abs);

    // platform/** 永久允许
    if (abs.startsWith(PLATFORM_DIR + path.sep) || abs === PLATFORM_DIR) {
      continue;
    }

    const text = fs.readFileSync(abs, 'utf8');
    const sourceFile = ts.createSourceFile(abs, text, ts.ScriptTarget.Latest, true, getScriptKind(abs));
    const obsSpecs = extractObsidianSpecs(sourceFile);
    if (!obsSpecs.length) continue;

    importing.add(relPath);

    for (const s of obsSpecs) {
      offenders.push({ file: relPath, loc: formatLoc(sourceFile, s.pos), kind: s.kind });
    }
  }

  const violations = [];

  for (const o of offenders) {
    if (!allow.has(o.file)) {
      violations.push({
        file: path.join(ROOT, o.file),
        loc: o.loc,
        message: `OBS-LEAK-001 ${o.file}:${o.loc} 不允许 import 'obsidian'（仅允许 src/platform/** + allowlist）`,
        hint: `修复：把 Obsidian API 访问下沉到 src/platform/**（adapter），并在上层使用 ports；或（过渡期）把该文件加入 allowlist：scripts/obsidian-leak-gate.allowlist.json`,
      });
    }
  }

  // optional: allowlist 中已不再 import obsidian 的条目（不阻断）
  const stale = Array.from(allow).filter((p) => !importing.has(p));

  if (violations.length) {
    failWithViolations('obsidian-leak-gate', violations, { rootDir: ROOT, summary: "冻结扩散：platform 外禁止 import obsidian" });
  }

  printOk('obsidian-leak-gate', `platform 外 import obsidian 文件数（已 allowlist）：${importing.size}`);
  if (stale.length) {
    console.log('[obsidian-leak-gate] allowlist 可收敛：以下条目已不再 import obsidian（建议移除）');
    for (const p of stale) console.log(`[obsidian-leak-gate] ${p}:0:0 - stale allowlist candidate`);
  }
}

main();
