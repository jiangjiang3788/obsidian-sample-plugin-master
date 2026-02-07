#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Core Public Facade Import Gate
// ---------------------------------------------------------------------------
// 目标：禁止 core 内部模块 import "@core/public"。
//
// 背景：
// - @core/public 是“对外门面（facade）”，会 re-export core 内部实现。
// - core 内部如果反向 import @core/public，会形成循环依赖：
//     core/* -> @core/public -> core/*
//   打包后极易触发 TDZ（Cannot access 'X' before initialization）。
//
// 规则：
// - src/core/public.ts 允许（它就是门面）。
// - 其它 src/core/** 不允许出现对 @core/public 的 import/export/require。

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const ROOT = process.cwd();
const CORE_DIR = path.join(ROOT, 'src', 'core');

function rel(p) {
  return path.relative(ROOT, p).replaceAll('\\', '/');
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/(\.ts|\.tsx|\.js|\.jsx|\.mts|\.cts)$/.test(e.name)) out.push(full);
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

function formatLoc(sourceFile, pos) {
  try {
    const lc = ts.getLineAndCharacterOfPosition(sourceFile, pos);
    return `${lc.line + 1}:${lc.character + 1}`;
  } catch {
    return '?:?';
  }
}

function extractImports(sourceFile) {
  /** @type {{ spec: string, pos: number, kind: string }[]} */
  const specs = [];

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
  return specs;
}

function main() {
  if (!fs.existsSync(CORE_DIR)) {
    console.log('✅ Core Public Gate 通过（未发现 src/core 目录）');
    process.exit(0);
  }

  const files = walk(CORE_DIR);
  const offenders = [];

  for (const abs of files) {
    const r = rel(abs);
    // 允许门面本身
    if (r === 'src/core/public.ts') continue;

    const text = fs.readFileSync(abs, 'utf8');
    const sourceFile = ts.createSourceFile(abs, text, ts.ScriptTarget.Latest, true, getScriptKind(abs));
    const specs = extractImports(sourceFile).filter((x) => x.spec === '@core/public');
    for (const s of specs) {
      offenders.push({ file: r, loc: formatLoc(sourceFile, s.pos), kind: s.kind });
    }
  }

  if (offenders.length) {
    console.error('\n❌ Core Public Gate failed:\n');
    for (const o of offenders) {
      console.error(`- CORE-PUB-001 ${o.file}:${o.loc} 不允许 ${o.kind} '@core/public'`);
      console.error('  修复：core 内部请直接从具体模块 import（例如 @core/ports/*, @core/types/*, @core/services/*），@core/public 仅供 app/features/shared 使用。\n');
    }
    process.exit(1);
  }

  console.log('✅ Core Public Gate 通过（core 内部未发现对 @core/public 的依赖）');
}

main();
