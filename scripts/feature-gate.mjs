#!/usr/bin/env node
// scripts/feature-gate.mjs
// ---------------------------------------------------------------------------
// Feature Isolation Gate
// ---------------------------------------------------------------------------
// Goal (4.5): any file under src/features/<A>/ MUST NOT import
// src/features/<B>/ when A !== B.
// The only legal collaboration path is via:
// - app/capabilities (composition)
// - core/public (domain contracts)
// - shared (shared UI/util)
//
// This gate is AST-based and uses tsconfig module resolution.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const FEATURES_DIR = path.join(SRC_DIR, 'features');

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

function loadTsConfig() {
  const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    throw new Error('feature-gate: tsconfig.json not found');
  }
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error('feature-gate: failed to read tsconfig.json');
  }
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
  return { compilerOptions: parsed.options };
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

function featureNameOf(absPath) {
  const rel = toPosix(path.relative(FEATURES_DIR, absPath));
  const parts = rel.split('/');
  if (!parts[0] || parts[0] === '..' || parts[0] === '.') return null;
  return parts[0];
}

function formatLoc(sourceFile, pos) {
  try {
    const lc = ts.getLineAndCharacterOfPosition(sourceFile, pos);
    return `${lc.line + 1}:${lc.character + 1}`;
  } catch {
    return '?:?';
  }
}

const allowlistPath = path.join(ROOT, 'scripts', 'feature-gate.allowlist.json');
/** @type {Set<string>} */
const allow = new Set();

if (fs.existsSync(allowlistPath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
    const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.allow) ? parsed.allow : [];
    for (const s of items) {
      if (typeof s === 'string' && s.trim()) allow.add(s.trim());
    }
  } catch {
    // ignore
  }
}

const { compilerOptions } = loadTsConfig();
const resolver = createResolver(compilerOptions);

/** @type {{ file: string, loc: string, msg: string, key: string }[]} */
const violations = [];
/** @type {Set<string>} */
const seenCrossEdges = new Set();

if (!fs.existsSync(FEATURES_DIR)) {
  console.log('✅ Feature Gate PASSED (no src/features directory)');
  process.exit(0);
}

const files = [];
walkDir(FEATURES_DIR, (abs) => {
  if (!/\.(ts|tsx|js|jsx)$/.test(abs)) return;
  files.push(abs);
});

for (const absPath of files) {
  const importerFeature = featureNameOf(absPath);
  if (!importerFeature) continue;

  const code = fs.readFileSync(absPath, 'utf8');
  const sf = ts.createSourceFile(absPath, code, ts.ScriptTarget.Latest, true, getScriptKind(absPath));
  const specs = extractModuleSpecifiers(sf);

  for (const { spec, pos, kind } of specs) {
    const resolved = resolver.resolve(spec, absPath);
    if (!resolved) continue;
    const targetAbs = resolved.resolvedFileName;
    if (!targetAbs.startsWith(FEATURES_DIR)) continue;

    const targetFeature = featureNameOf(targetAbs);
    if (!targetFeature) continue;
    if (targetFeature === importerFeature) continue;

    const importerRel = toPosix(path.relative(ROOT, absPath));
    const targetRel = toPosix(path.relative(ROOT, targetAbs));
    const key = `${importerRel} -> ${targetRel}`;
    seenCrossEdges.add(key);

    if (!allow.has(key)) {
      violations.push({
        file: absPath,
        loc: formatLoc(sf, pos),
        msg: `❌ Cross-feature import 禁止: ${importerFeature} -> ${targetFeature} (via ${kind} '${spec}')\n   ${importerRel} -> ${targetRel}`,
        key,
      });
    }
  }
}

// Enforce “allowlist can only shrink” in practice: if allowlist contains
// entries that no longer exist, fail and force cleanup.
const staleAllow = [...allow].filter((k) => !seenCrossEdges.has(k));

if (staleAllow.length) {
  console.error('===== Feature Gate FAILED (stale allowlist entries) =====');
  console.error(`\nAllowlist contains ${staleAllow.length} stale entries (please remove them):`);
  for (const k of staleAllow) console.error(`- ${k}`);
  process.exit(1);
}

if (violations.length) {
  console.error('===== Feature Gate FAILED =====');
  for (const v of violations) {
    const rel = toPosix(path.relative(ROOT, v.file));
    console.error(`\n${rel}:${v.loc}`);
    console.error(v.msg);
  }
  console.error(`\nTotal cross-feature violations: ${violations.length}`);
  if (allow.size) {
    console.error(`Allowlist size: ${allow.size} (scripts/feature-gate.allowlist.json)`);
  }
  process.exit(1);
}

console.log('✅ Feature Gate PASSED');
