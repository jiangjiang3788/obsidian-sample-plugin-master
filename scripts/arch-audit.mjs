#!/usr/bin/env node
// ---------------------------------------------------------------------------
// 架构审计（Architecture Audit）
// 目的：把“架构现状”变成可量化的产物：文件规模、依赖边、跨 feature 依赖、反向依赖等。
// 输出：
//  - 控制台（全中文）：让你一眼看懂当前指标
//  - reports/arch/summary.json：给 CI/PR 做对比、追踪收敛
//  - reports/arch/deps.dot：Graphviz 可视化（可选）
// ---------------------------------------------------------------------------

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
const REPORT_DIR = path.join(ROOT, 'reports', 'arch');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function walkDir(dir, cb) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(abs, cb);
    else cb(abs);
  }
}

function isCodeFile(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  return ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'].includes(ext);
}

function layerOf(absPath) {
  const rel = toPosix(path.relative(SRC_DIR, absPath));
  if (rel.startsWith('core/')) return 'core';
  if (rel.startsWith('app/')) return 'app';
  if (rel.startsWith('shared/')) return 'shared';
  if (rel.startsWith('features/')) return 'features';
  return 'other';
}

function featureOf(absPath) {
  const rel = toPosix(path.relative(SRC_DIR, absPath));
  if (!rel.startsWith('features/')) return null;
  const parts = rel.split('/');
  return parts.length >= 2 ? parts[1] : null;
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
  /** @type {{ spec: string, pos: number }[]} */
  const specs = [];

  function visit(node) {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specs.push({ spec: node.moduleSpecifier.text, pos: node.moduleSpecifier.getStart(sourceFile) });
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specs.push({ spec: node.moduleSpecifier.text, pos: node.moduleSpecifier.getStart(sourceFile) });
    }
    if (ts.isCallExpression(node) && node.expression && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const arg0 = node.arguments && node.arguments[0];
      if (arg0 && ts.isStringLiteral(arg0)) {
        specs.push({ spec: arg0.text, pos: arg0.getStart(sourceFile) });
      }
    }
    if (ts.isCallExpression(node) && node.expression && ts.isIdentifier(node.expression) && node.expression.escapedText === 'require') {
      const arg0 = node.arguments && node.arguments[0];
      if (arg0 && ts.isStringLiteral(arg0)) {
        specs.push({ spec: arg0.text, pos: arg0.getStart(sourceFile) });
      }
    }
    if (ts.isImportEqualsDeclaration(node)) {
      const ref = node.moduleReference;
      if (ref && ts.isExternalModuleReference(ref) && ref.expression && ts.isStringLiteral(ref.expression)) {
        specs.push({ spec: ref.expression.text, pos: ref.expression.getStart(sourceFile) });
      }
    }
    if (ts.isImportTypeNode(node)) {
      const arg = node.argument;
      if (arg && ts.isLiteralTypeNode(arg) && ts.isStringLiteral(arg.literal)) {
        specs.push({ spec: arg.literal.text, pos: arg.literal.getStart(sourceFile) });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specs;
}

function loadTsConfig() {
  const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) throw new Error('未找到 tsconfig.json（无法做模块解析）');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) throw new Error('读取 tsconfig.json 失败（无法做模块解析）');
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

  function resolve(spec, importerAbs) {
    const res = ts.resolveModuleName(spec, importerAbs, compilerOptions, resolutionHost, cache);
    const m = res && res.resolvedModule;
    if (!m) return null;
    if (m.isExternalLibraryImport) return null;
    let resolved = m.resolvedFileName;
    if (!resolved) return null;
    if (!path.isAbsolute(resolved)) resolved = path.resolve(ROOT, resolved);
    return resolved;
  }

  return { resolve };
}

function inc(map, key, delta = 1) {
  map[key] = (map[key] || 0) + delta;
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.log('未发现 src 目录，无法进行架构审计。');
    process.exit(0);
  }

  const { compilerOptions } = loadTsConfig();
  const { resolve } = createResolver(compilerOptions);

  /** @type {string[]} */
  const files = [];
  walkDir(SRC_DIR, (abs) => {
    if (!isCodeFile(abs)) return;
    if (abs.includes(`${path.sep}__tests__${path.sep}`)) return;
    files.push(abs);
  });

  const fileCountsByLayer = {};
  const fileCountsByFeature = {};
  for (const f of files) {
    inc(fileCountsByLayer, layerOf(f), 1);
    const feat = featureOf(f);
    if (feat) inc(fileCountsByFeature, feat, 1);
  }

  // edges
  let totalEdges = 0;
  const layerEdgeMatrix = {}; // fromLayer -> toLayer -> count
  const crossFeatureEdges = []; // { fromFeature, toFeature, fromFile, toFile, spec }
  const reverseDeps = {
    'core->shared': 0,
    'core->app': 0,
    'core->features': 0,
  };

  for (const importerAbs of files) {
    const sourceText = fs.readFileSync(importerAbs, 'utf8');
    const sourceFile = ts.createSourceFile(importerAbs, sourceText, ts.ScriptTarget.Latest, true, getScriptKind(importerAbs));
    const specs = extractModuleSpecifiers(sourceFile);

    for (const { spec } of specs) {
      if (!spec || typeof spec !== 'string') continue;

      const targetAbs = resolve(spec, importerAbs);
      if (!targetAbs) continue;

      // only count internal src targets
      const targetAbsNorm = path.resolve(targetAbs);
      if (!targetAbsNorm.startsWith(path.resolve(SRC_DIR) + path.sep)) continue;

      totalEdges += 1;

      const fromLayer = layerOf(importerAbs);
      const toLayer = layerOf(targetAbsNorm);

      layerEdgeMatrix[fromLayer] = layerEdgeMatrix[fromLayer] || {};
      inc(layerEdgeMatrix[fromLayer], toLayer, 1);

      if (fromLayer === 'core' && toLayer === 'shared') reverseDeps['core->shared'] += 1;
      if (fromLayer === 'core' && toLayer === 'app') reverseDeps['core->app'] += 1;
      if (fromLayer === 'core' && toLayer === 'features') reverseDeps['core->features'] += 1;

      const fromFeat = featureOf(importerAbs);
      const toFeat = featureOf(targetAbsNorm);
      if (fromFeat && toFeat && fromFeat !== toFeat) {
        crossFeatureEdges.push({
          fromFeature: fromFeat,
          toFeature: toFeat,
          fromFile: toPosix(path.relative(ROOT, importerAbs)),
          toFile: toPosix(path.relative(ROOT, targetAbsNorm)),
          spec,
        });
      }
    }
  }

  // build dot graph (layer-level)
  const dotLines = [];
  dotLines.push('digraph deps {');
  dotLines.push('  rankdir=LR;');
  dotLines.push('  node [shape=box];');

  const layers = ['core', 'shared', 'features', 'app', 'other'];
  for (const l of layers) dotLines.push(`  "${l}";`);

  for (const from of Object.keys(layerEdgeMatrix)) {
    for (const to of Object.keys(layerEdgeMatrix[from] || {})) {
      const n = layerEdgeMatrix[from][to];
      dotLines.push(`  "${from}" -> "${to}" [label="${n}"];`);
    }
  }
  dotLines.push('}');

  ensureDir(REPORT_DIR);

  const summary = {
    generatedAt: new Date().toISOString(),
    files: {
      total: files.length,
      byLayer: fileCountsByLayer,
      byFeature: fileCountsByFeature,
    },
    imports: {
      totalEdges,
      layerEdgeMatrix,
      crossFeature: {
        count: crossFeatureEdges.length,
        edges: crossFeatureEdges,
      },
      reverseDeps,
    },
  };

  fs.writeFileSync(path.join(REPORT_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  fs.writeFileSync(path.join(REPORT_DIR, 'deps.dot'), dotLines.join('\n'), 'utf8');

  // 控制台输出（全中文）
  console.log('\n================ 架构审计报告（Architecture Audit）================');
  console.log(`生成时间：${summary.generatedAt}`);
  console.log('\n【文件规模】');
  console.log(`- 总文件数（ts/tsx/js/jsx 等）：${summary.files.total}`);
  for (const l of layers) {
    const c = summary.files.byLayer[l] || 0;
    console.log(`  - ${l}：${c}`);
  }

  // feature top list
  const featEntries = Object.entries(summary.files.byFeature).sort((a, b) => b[1] - a[1]);
  if (featEntries.length) {
    console.log('\n【按 Feature 统计文件数】');
    for (const [name, c] of featEntries) {
      console.log(`  - ${name}：${c}`);
    }
  }

  console.log('\n【依赖边（import/export）】');
  console.log(`- 内部依赖边总数（解析到 src 内部文件）：${summary.imports.totalEdges}`);
  console.log(`- 跨 feature 依赖边：${summary.imports.crossFeature.count}`);
  console.log(`- 反向依赖（不建议/通常需要清零）：core->shared=${summary.imports.reverseDeps['core->shared']}, core->app=${summary.imports.reverseDeps['core->app']}, core->features=${summary.imports.reverseDeps['core->features']}`);

  if (summary.imports.crossFeature.count > 0) {
    console.log('\n【跨 feature 依赖明细（前 30 条）】');
    summary.imports.crossFeature.edges.slice(0, 30).forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.fromFeature} -> ${e.toFeature}`);
      console.log(`     from: ${e.fromFile}`);
      console.log(`     to  : ${e.toFile}`);
      console.log(`     spec: ${e.spec}`);
    });
    if (summary.imports.crossFeature.count > 30) {
      console.log(`  ...（剩余 ${summary.imports.crossFeature.count - 30} 条请看 reports/arch/summary.json）`);
    }
  } else {
    console.log('\n✅ 跨 feature 依赖：已清零（这是 4.5 的关键指标）');
  }

  console.log('\n产物已输出：');
  console.log(`- reports/arch/summary.json（指标/明细）`);
  console.log(`- reports/arch/deps.dot（Graphviz 可视化，可选）`);
  console.log('==================================================================\n');
}

main();
