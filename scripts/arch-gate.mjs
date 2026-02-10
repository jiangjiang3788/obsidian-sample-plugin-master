#!/usr/bin/env node
// ---------------------------------------------------------------------------
// 架构硬闸（Architecture Gate）
// 目的：用 TypeScript AST 可靠解析 import/export，避免用正则被“换行 import”等方式绕过。
// 结果：一旦违反分层/出口规则，CI 直接失败，让架构“物理上难违规”。
// ---------------------------------------------------------------------------
// scripts/arch-gate.mjs
// ---------------------------------------------------------------------------
// 架构硬闸（AST 解析）
// ---------------------------------------------------------------------------
// Why AST?
// - Regex-based import scanning can be bypassed by multi-line imports, exotic
//   export forms, or type-level import() usage.
// - This gate uses the TypeScript compiler API to *reliably* extract:
//   - import ... from 'x'
//   - export ... from 'x'
//   - dynamic import('x')
//   - require('x')
//   - type T = import('x').Foo
// And resolves modules using tsconfig (baseUrl/paths) to real files.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

import { failWithViolations, printOk } from './gate-formatter.mjs';

const require = createRequire(import.meta.url);
// Use require() so this works even when TypeScript is provided via CommonJS.
// (ESM import may fail in some Node setups if TS isn't locally installed.)
const ts = require('typescript');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');

const APP_PUBLIC = path.join(SRC_DIR, 'app', 'public.ts');
const APP_CAPABILITIES_PUBLIC = path.join(SRC_DIR, 'app', 'capabilities', 'public.ts');
const CORE_PUBLIC = path.join(SRC_DIR, 'core', 'public.ts');

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function walkDir(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(abs, cb);
    else cb(abs);
  }
}

function layerOf(absPath) {
  const rel = toPosix(path.relative(SRC_DIR, absPath));
  if (rel.startsWith('core/')) return 'core';
  if (rel.startsWith('app/')) return 'app';
  if (rel.startsWith('shared/')) return 'shared';
  if (rel.startsWith('features/')) return 'features';
  return 'other';
}

function isAppPublicFile(targetAbs) {
  return path.resolve(targetAbs) === path.resolve(APP_PUBLIC);
}

function isAppCapabilitiesPublicFile(targetAbs) {
  return path.resolve(targetAbs) === path.resolve(APP_CAPABILITIES_PUBLIC);
}

function isCorePublicFile(targetAbs) {
  return path.resolve(targetAbs) === path.resolve(CORE_PUBLIC);
}

// Keep this “capability” lock as a string/regex scan.
// The di-gate is the main enforcement; this gives an early, clear error.
function hasTsyringeContainerAccess(sourceText) {
  // Matches:
  //  - import { container } from 'tsyringe'
  //  - import { something, container } from "tsyringe"
  //  - import * as tsyringe from 'tsyringe'  (and later uses tsyringe.container)
  //  - require('tsyringe').container
  //  - tsyringe.container
  const re1 = /import\s*\{[^}]*\bcontainer\b[^}]*\}\s*from\s*['"]tsyringe['"]/g;
  const re2 = /\btsyringe\.container\b/g;
  const re3 = /require\(\s*['"]tsyringe['"]\s*\)\s*\.\s*container/g;
  const re4 = /\bcontainer\s*from\s*['"]tsyringe['"]/g;
  return re1.test(sourceText) || re2.test(sourceText) || re3.test(sourceText) || re4.test(sourceText);
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

function extractModuleSpecifiers(sourceFile) {
  /** @type {{ spec: string, pos: number, kind: string }[]} */
  const specs = [];

  /** @param {any} node */
  function visit(node) {
    // import ... from 'x'
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specs.push({ spec: node.moduleSpecifier.text, pos: node.moduleSpecifier.getStart(sourceFile), kind: 'import' });
    }

    // export ... from 'x'
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specs.push({ spec: node.moduleSpecifier.text, pos: node.moduleSpecifier.getStart(sourceFile), kind: 'export' });
    }

    // import('x')
    if (ts.isCallExpression(node) && node.expression && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const arg0 = node.arguments && node.arguments[0];
      if (arg0 && ts.isStringLiteral(arg0)) {
        specs.push({ spec: arg0.text, pos: arg0.getStart(sourceFile), kind: 'import()' });
      }
    }

    // require('x')
    if (ts.isCallExpression(node) && node.expression && ts.isIdentifier(node.expression) && node.expression.escapedText === 'require') {
      const arg0 = node.arguments && node.arguments[0];
      if (arg0 && ts.isStringLiteral(arg0)) {
        specs.push({ spec: arg0.text, pos: arg0.getStart(sourceFile), kind: 'require()' });
      }
    }

    // import x = require('x')
    if (ts.isImportEqualsDeclaration(node)) {
      const ref = node.moduleReference;
      if (ref && ts.isExternalModuleReference(ref) && ref.expression && ts.isStringLiteral(ref.expression)) {
        specs.push({ spec: ref.expression.text, pos: ref.expression.getStart(sourceFile), kind: 'import=' });
      }
    }

    // type T = import('x').Foo
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

function loadTsConfig() {
  const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    throw new Error('arch-gate：未找到 tsconfig.json');
  }
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error('arch-gate：读取 tsconfig.json 失败');
  }
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
  return { compilerOptions: parsed.options, configPath };
}

function createResolver(compilerOptions) {
  const resolutionHost = {
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    directoryExists: ts.sys.directoryExists,
    getCurrentDirectory: () => ROOT,
    getDirectories: ts.sys.getDirectories,
    realpath: ts.sys.realpath,
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
  };
  const cache = ts.createModuleResolutionCache(ROOT, (s) => s, compilerOptions);

  /**
   * @param {string} spec
   * @param {string} importerAbs
   */
  function resolve(spec, importerAbs) {
    const res = ts.resolveModuleName(spec, importerAbs, compilerOptions, resolutionHost, cache);
    const m = res && res.resolvedModule;
    if (!m) return null;
    let resolved = m.resolvedFileName;
    if (!resolved) return null;
    if (!path.isAbsolute(resolved)) resolved = path.resolve(ROOT, resolved);
    return {
      resolvedFileName: resolved,
      isExternalLibraryImport: !!m.isExternalLibraryImport,
    };
  }

  return { resolve };
}

function formatLoc(sourceFile, pos) {
  try {
    const lc = ts.getLineAndCharacterOfPosition(sourceFile, pos);
    return `${lc.line + 1}:${lc.character + 1}`;
  } catch {
    return '?:?';
  }
}

// ------------------------------
// Main
// ------------------------------

const errors = [];

const { compilerOptions } = loadTsConfig();
const resolver = createResolver(compilerOptions);

/**
 * Collect files to scan.
 * We intentionally scan source files only. Config/test files outside src are ignored.
 */
const files = [];
walkDir(SRC_DIR, (abs) => {
  if (!/\.(ts|tsx|js|jsx)$/.test(abs)) return;
  files.push(abs);
});

for (const absPath of files) {
  const importerLayer = layerOf(absPath);
  if (importerLayer === 'other') continue;

  const code = fs.readFileSync(absPath, 'utf8');
  const sf = ts.createSourceFile(absPath, code, ts.ScriptTarget.Latest, true, getScriptKind(absPath));

  // Rule 0: prevent container access from features/shared
  if ((importerLayer === 'features' || importerLayer === 'shared') && hasTsyringeContainerAccess(code)) {
    errors.push({
      file: absPath,
      msg: '❌ Rule0: features/shared 禁止访问 tsyringe.container（必须由上层 app 组合注入）',
    });
  }

  const specs = extractModuleSpecifiers(sf);
  for (const { spec, pos, kind } of specs) {
    const resolved = resolver.resolve(spec, absPath);
    if (!resolved) continue;
    const targetAbs = resolved.resolvedFileName;
    if (!targetAbs.startsWith(SRC_DIR)) continue; // ignore node_modules/external

    const targetLayer = layerOf(targetAbs);
    if (targetLayer === 'other') continue;

    // ---- Rule 1: core cannot depend on app/features/shared (strict)
    if (importerLayer === 'core' && (targetLayer === 'app' || targetLayer === 'features' || targetLayer === 'shared')) {
      errors.push({
        file: absPath,
        msg: `❌ Rule1: core 禁止依赖 ${targetLayer} (found via ${kind} '${spec}')`,
        loc: formatLoc(sf, pos),
      });
      continue;
    }

    // ---- Rule 2: shared cannot depend on features
    if (importerLayer === 'shared' && targetLayer === 'features') {
      errors.push({
        file: absPath,
        msg: `❌ Rule2: shared 禁止依赖 features (found via ${kind} '${spec}')`,
        loc: formatLoc(sf, pos),
      });
      continue;
    }

    // ---- Rule 3: features/shared can only access app through app/public.ts or app/capabilities/public.ts
    if ((importerLayer === 'features' || importerLayer === 'shared') && targetLayer === 'app') {
      if (!isAppPublicFile(targetAbs) && !isAppCapabilitiesPublicFile(targetAbs)) {
        errors.push({
          file: absPath,
          msg: `❌ Rule3: features/shared 只能通过 app/public.ts 或 app/capabilities/public.ts 访问 app (found via ${kind} '${spec}' -> ${toPosix(path.relative(ROOT, targetAbs))})`,
          loc: formatLoc(sf, pos),
        });
        continue;
      }
    }

    // ---- Rule 3b: non-core can only access core through core/public.ts
    if (importerLayer !== 'core' && targetLayer === 'core') {
      if (!isCorePublicFile(targetAbs)) {
        errors.push({
          file: absPath,
          msg: `❌ Rule3b: 非 core 层访问 core 必须通过 core/public.ts (found via ${kind} '${spec}' -> ${toPosix(path.relative(ROOT, targetAbs))})`,
          loc: formatLoc(sf, pos),
        });
        continue;
      }
    }
  }
}

if (errors.length) {
  failWithViolations('arch-gate', errors.map((e) => ({
    file: e.file,
    loc: e.loc,
    message: e.msg.replace(/\s+/g, ' ').trim(),
    hint: '根据分层规则修复 import/export，必要时通过 public 门面收口',
  })), { rootDir: ROOT, summary: 'Architecture Gate FAILED' });
}

printOk('arch-gate', 'AST 分析通过');