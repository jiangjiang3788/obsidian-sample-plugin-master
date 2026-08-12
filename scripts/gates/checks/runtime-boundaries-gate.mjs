#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { failWithViolations, printOk } from '../../lib/gate-formatter.mjs';
import { SHARED_MODULE_PUBLIC_FACADES, SHARED_ROOT_PUBLIC_FACADE, isSharedPublicFacadeSpecifier } from '../public-facades.config.mjs';

function check_core_public_gate() {
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
      return;
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
      failWithViolations('core-public-gate', offenders.map((o) => ({
        file: path.join(ROOT, o.file),
        loc: o.loc,
        message: `CORE-PUB-001 core 内部不允许 ${o.kind} '@core/public'`,
        hint: 'core 内部请直接从具体模块 import（例如 @core/ports/*, @core/types/*, @core/services/*），@core/public 仅供 app/features/shared 使用',
      })), { rootDir: ROOT, summary: 'core 内部依赖了 @core/public' });
    }

    printOk('core-public-gate', 'core 内部未发现对 @core/public 的依赖');
  }

  main();
}

check_core_public_gate();

function check_shared_public_gate() {
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
}

check_shared_public_gate();

function check_core_obsidian_gate() {
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



  const require = createRequire(import.meta.url);
  const ts = require('typescript');

  const ROOT = process.cwd();
  const CORE_DIR = path.join(ROOT, 'src', 'core');
  const ALLOWLIST_PATH = path.join(ROOT, 'scripts', 'gates', 'core-obsidian-gate.allowlist.json');

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
      return;
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
            `修复：将 Obsidian API 访问移到 platform 层或 app 组合根；或（过渡期）把该文件加入 allowlist：scripts/gates/core-obsidian-gate.allowlist.json`
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
}

check_core_obsidian_gate();

function check_shared_runtime_boundary_gate() {
  // ---------------------------------------------------------------------------
  // Shared Runtime Boundary Gate
  // ---------------------------------------------------------------------------
  // shared/** 是跨 feature 的纯 UI / 工具层，不应直接接收 Obsidian App 实例，
  // 也不应依赖 app public barrel。需要运行时能力时，请通过 shared/types/actions.ts
  // 的 handler 合同注入，例如：resolveResourcePath / onOpenRecordOrigin / onNotice。



  const ROOT = process.cwd();
  const SHARED_DIR = path.join(ROOT, 'src', 'shared');

  const RULES = [
    {
      code: 'SHARED-RUNTIME-001',
      pattern: /from\s+['"]@\/app\/public['"]/,
      message: "src/shared 不允许 import '@/app/public'，请通过 handler 合同注入能力",
    },
    {
      code: 'SHARED-RUNTIME-002',
      pattern: /\bapp\??\s*:\s*any\b/,
      message: 'src/shared 不允许声明 app:any / app?:any，请改为更小的 handler 合同',
    },
    {
      code: 'SHARED-RUNTIME-003',
      pattern: /\bapp\.vault\b|\bapp\?\.vault\b/,
      message: 'src/shared 不允许直接访问 Obsidian app.vault，请注入 resolveResourcePath / onOpenRecordOrigin 等能力',
    },
  ];

  function walk(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs, out);
      else if (/\.(ts|tsx|js|jsx|mts|cts)$/.test(entry.name)) out.push(abs);
    }
    return out;
  }

  function rel(abs) {
    return path.relative(ROOT, abs).replaceAll('\\\\', '/');
  }

  function main() {
    const violations = [];
    for (const file of walk(SHARED_DIR)) {
      const text = fs.readFileSync(file, 'utf8');
      const lines = text.split(/\r?\n/);
      lines.forEach((line, index) => {
        for (const rule of RULES) {
          if (!rule.pattern.test(line)) continue;
          violations.push({
            file,
            loc: `${index + 1}:1`,
            message: `${rule.code} ${rel(file)}:${index + 1}: ${rule.message}`,
            hint: '修复：把 Obsidian/App 运行时能力上移到 feature/app/platform 层，在 shared/types/actions.ts 中定义最小 handler。',
          });
        }
      });
    }

    if (violations.length) {
      failWithViolations('shared-runtime-boundary-gate', violations, {
        rootDir: ROOT,
        summary: 'shared 层运行时边界被破坏',
      });
    }

    printOk('shared-runtime-boundary-gate', 'shared 层未发现 app public / app:any / app.vault 泄漏');
  }

  main();
}

check_shared_runtime_boundary_gate();

function check_events_boundary_gate() {
  // ---------------------------------------------------------------------------
  // Events Boundary Gate
  // ---------------------------------------------------------------------------
  // Goal:
  // - src/platform/** is the ONLY place allowed to subscribe to Obsidian vault/workspace events
  //   via app.vault.on / app.workspace.on / workspace.on / vault.on
  // - non-platform code must use EventsPort instead (and remain dispose-safe)
  //
  // This gate prevents regressions.
  // ---------------------------------------------------------------------------


  const repoRoot = process.cwd();
  const srcRoot = path.join(repoRoot, 'src');

  const patterns = [
    { name: 'vault.on', re: /\b(app\.)?vault\.on\s*\(/g },
    { name: 'workspace.on', re: /\b(app\.)?workspace\.on\s*\(/g },
    { name: 'registerEvent', re: /\bregisterEvent\s*\(/g },
  ];

  function walk(dir) {
    const out = [];
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) out.push(...walk(p));
      else if (ent.isFile() && /\.(ts|tsx|mts|cts)$/.test(ent.name)) out.push(p);
    }
    return out;
  }

  function isPlatform(absPath) {
    const rel = path.relative(srcRoot, absPath).replace(/\\/g, '/');
    return rel.startsWith('platform/');
  }

  function findHits(filePath) {
    const text = fs.readFileSync(filePath, 'utf8');
    const hits = [];
    for (const pat of patterns) {
      pat.re.lastIndex = 0;
      if (pat.re.test(text)) hits.push(pat.name);
    }
    return hits;
  }

  const files = walk(srcRoot).filter(f => !isPlatform(f));

  const violations = [];
  for (const f of files) {
    const rel = path.relative(repoRoot, f).replace(/\\/g, '/');
    const hits = findHits(f);
    // registerEvent is only meaningful when paired with vault/workspace usage, but still keep it platform-only
    if (hits.length > 0) {
      violations.push({ file: rel, hits });
    }
  }

  if (violations.length === 0) {
    console.log('✅ [events-boundary-gate] No vault/workspace subscriptions outside src/platform/**');
    return;
  }

  console.log('❌ [events-boundary-gate] Found Obsidian event subscriptions outside src/platform/**');
  for (const v of violations) {
    console.log(`- ${v.file} (${v.hits.join(', ')})`);
  }
  process.exit(1);
}

check_events_boundary_gate();

function check_obsidian_leak_gate() {
  // ---------------------------------------------------------------------------
  // Obsidian API Leak Gate (stop bleeding)
  // ---------------------------------------------------------------------------
  // 目标：除 src/platform/**（+allowlist）外，禁止任何地方 import 'obsidian'
  // - platform 层可以直接使用 Obsidian API
  // - 其它层只能通过 ports/adapters 间接访问
  // - allowlist 用于“祖父条款”：先冻结扩散，再逐步迁移并收敛 allowlist
  //
  // 验收：allowlist 外命中 `from 'obsidian'`/dynamic import/require/import type/export from 立即 fail 并定位到行列。



  const require = createRequire(import.meta.url);
  const ts = require('typescript');

  const ROOT = process.cwd();
  const SRC_DIR = path.join(ROOT, 'src');
  const PLATFORM_DIR = path.join(SRC_DIR, 'platform');
  const ALLOWLIST_PATH = path.join(ROOT, 'scripts', 'gates', 'obsidian-leak-gate.allowlist.json');

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
      return;
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
          hint: `修复：把 Obsidian API 访问下沉到 src/platform/**（adapter），并在上层使用 ports；或（过渡期）把该文件加入 allowlist：scripts/gates/obsidian-leak-gate.allowlist.json`,
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
}

check_obsidian_leak_gate();
