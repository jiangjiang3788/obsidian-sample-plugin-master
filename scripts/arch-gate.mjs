// scripts/arch-gate.mjs
// -----------------------------------------------------------------------------
// Architecture Gate (Phase 4)
// -----------------------------------------------------------------------------
// 目标：把“约定”变成“不可绕过的事实”。
//
// 为什么不只依赖 ESLint：
// - ESLint 可以被局部 disable；也容易因为 patterns 漏洞被绕过。
// - 这个脚本会“解析并解析后校验”每个 import 的真实目标路径，作为 CI 的硬闸门。
//
// 设计原则：
// - 规则尽量少，但必须强：
//   1) core 不能依赖 app/features
//   2) shared 不能依赖 features；shared 访问 app 只能通过 app/public
//   3) features 访问 app 只能通过 app/public
//   4) app/usecases 不能依赖 features（UseCases 必须保持纯应用层 Facade）
//
// 运行：
//   npm run arch:gate
// -----------------------------------------------------------------------------

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');

/**
 * 你可以在这里添加“明确的历史例外”。
 * 例外必须是非常具体的（到文件级别），避免变成新的绕过通道。
 */
const ALLOWLIST = new Set([
  // format: `${fromRel} -> ${toRel}`
]);

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function relToRoot(absPath) {
  return toPosix(path.relative(ROOT, absPath));
}

function layerOf(absPath) {
  const rel = relToRoot(absPath);
  if (rel.startsWith('src/core/')) return 'core';
  if (rel.startsWith('src/app/')) return 'app';
  if (rel.startsWith('src/shared/')) return 'shared';
  if (rel.startsWith('src/features/')) return 'features';
  return 'other';
}

function isUseCasesFile(importerAbsPath) {
  const rel = relToRoot(importerAbsPath);
  return rel.startsWith('src/app/usecases/');
}

function isAppPublicFile(targetAbsPath) {
  return relToRoot(targetAbsPath) === 'src/app/public.ts';
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function resolveFile(baseAbsPath) {
  // 1) direct file with extension
  if (path.extname(baseAbsPath)) {
    if (await exists(baseAbsPath)) return baseAbsPath;
  } else {
    // 2) try with extensions
    for (const ext of EXTENSIONS) {
      const p = baseAbsPath + ext;
      if (await exists(p)) return p;
    }
  }

  // 3) directory index
  if (await exists(baseAbsPath)) {
    // might be a dir
    for (const ext of EXTENSIONS) {
      const idx = path.join(baseAbsPath, 'index' + ext);
      if (await exists(idx)) return idx;
    }
  }

  return null;
}

async function resolveImport(importerAbsPath, source) {
  // External deps
  if (!source.startsWith('.') && !source.startsWith('@/') && !source.startsWith('@')) {
    return { kind: 'external' };
  }

  // Relative
  if (source.startsWith('.')) {
    const base = path.resolve(path.dirname(importerAbsPath), source);
    const resolved = await resolveFile(base);
    if (resolved) return { kind: 'internal', absPath: resolved };
    return { kind: 'unresolved' };
  }

  // Alias: @/ -> src/
  if (source.startsWith('@/')) {
    const base = path.join(SRC_DIR, source.slice(2));
    const resolved = await resolveFile(base);
    if (resolved) return { kind: 'internal', absPath: resolved };
    return { kind: 'unresolved' };
  }

  // Alias: @main
  if (source === '@main') {
    const resolved = await resolveFile(path.join(SRC_DIR, 'main'));
    if (resolved) return { kind: 'internal', absPath: resolved };
    return { kind: 'unresolved' };
  }

  // Alias family: @core/, @app/, @shared/, @features/, @platform/ ...
  const aliasMap = {
    '@core/': path.join(SRC_DIR, 'core'),
    '@app/': path.join(SRC_DIR, 'app'),
    '@shared/': path.join(SRC_DIR, 'shared'),
    '@features/': path.join(SRC_DIR, 'features'),
    '@platform/': path.join(SRC_DIR, 'platform'),
    '@lib/': path.join(SRC_DIR, 'lib'),
    '@store/': path.join(SRC_DIR, 'store'),
    '@ui/': path.join(SRC_DIR, 'ui'),
    '@views/': path.join(SRC_DIR, 'views'),
    '@hooks/': path.join(SRC_DIR, 'hooks'),
    '@config/': path.join(SRC_DIR, 'config'),
    '@types/': path.join(SRC_DIR, 'types'),
    '@domain/': path.join(SRC_DIR, 'lib/types/domain'),
    '@utils/': path.join(SRC_DIR, 'utils'),
    '@services/': path.join(SRC_DIR, 'lib/services'),
    '@constants/': path.join(SRC_DIR, 'constants'),
  };

  for (const [prefix, dir] of Object.entries(aliasMap)) {
    if (source.startsWith(prefix)) {
      const base = path.join(dir, source.slice(prefix.length));
      const resolved = await resolveFile(base);
      if (resolved) return { kind: 'internal', absPath: resolved };
      return { kind: 'unresolved' };
    }
  }

  // Unknown @xxx - treat as external to avoid false positives.
  return { kind: 'external' };
}

function extractImportSources(code) {
  const sources = new Set();

  // import ... from 'x' / export ... from 'x' / import 'x'
  const re1 = /\b(?:import|export)\s+(?:type\s+)?(?:[^'"\n;]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  let m;
  while ((m = re1.exec(code))) sources.add(m[1]);

  // dynamic import('x')
  const re2 = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = re2.exec(code))) sources.add(m[1]);

  // require('x')
  const re3 = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = re3.exec(code))) sources.add(m[1]);

  return [...sources];
}

function hasTsyringeContainerAccess(code) {
  // Phase 4.3: 禁止在 features/shared 直接获得 DI container
  // - import { container } from 'tsyringe'
  // - import * as di from 'tsyringe' (namespace import 可访问 di.container)
  // - import di from 'tsyringe' (default import 也可访问 di.container)
  // - dynamic import('tsyringe') / require('tsyringe')
  // - const { container } = require('tsyringe')
  // - require('tsyringe').container
  const importRe = /\bimport\s*{[^}]*\bcontainer\b[^}]*}\s*from\s*['"]tsyringe['"]/m;
  const namespaceImportRe = /\bimport\s*\*\s*as\s*\w+\s*from\s*['"]tsyringe['"]/m;
  const defaultImportRe = /\bimport\s+\w+\s+from\s*['"]tsyringe['"]/m;
  const dynamicImportRe = /\bimport\s*\(\s*['"]tsyringe['"]\s*\)/m;
  const requireAnyRe = /\brequire\(\s*['"]tsyringe['"]\s*\)/m;
  const requireDestructureRe = /\bconst\s*{[^}]*\bcontainer\b[^}]*}\s*=\s*require\(\s*['"]tsyringe['"]\s*\)/m;
  const requirePropRe = /\brequire\(\s*['"]tsyringe['"]\s*\)\s*\.\s*container\b/m;
  return (
    importRe.test(code) ||
    namespaceImportRe.test(code) ||
    defaultImportRe.test(code) ||
    dynamicImportRe.test(code) ||
    // require(...) 一律视为危险：拿到了模块，就能拿到 container
    requireAnyRe.test(code) ||
    requireDestructureRe.test(code) ||
    requirePropRe.test(code)
  );
}

async function walk(dirAbs, out) {
  const entries = await fs.readdir(dirAbs, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dirAbs, e.name);
    if (e.isDirectory()) {
      // skip build artifacts
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      await walk(p, out);
    } else if (e.isFile()) {
      if (!EXTENSIONS.includes(path.extname(e.name))) continue;
      out.push(p);
    }
  }
}

function formatViolation({ importerRel, source, targetRel, message }) {
  return [
    `❌ ${message}`,
    `  from: ${importerRel}`,
    `  import: ${source}`,
    `  to: ${targetRel}`,
  ].join('\n');
}

async function main() {
  const files = [];
  await walk(SRC_DIR, files);

  const violations = [];

  for (const importerAbs of files) {
    const importerRel = relToRoot(importerAbs);
    const importerLayer = layerOf(importerAbs);

    // only gate the main architecture layers
    if (importerLayer === 'other') continue;

    const code = await fs.readFile(importerAbs, 'utf8');

    // ---------------- Rule 0: features/shared cannot access tsyringe.container ----------------
    if ((importerLayer === 'features' || importerLayer === 'shared') && hasTsyringeContainerAccess(code)) {
      violations.push({
        importerRel,
        source: "tsyringe.container",
        targetRel: '(external)',
        message:
          '[R0] features/shared 禁止直接获取 tsyringe.container（组合根必须上移到 app/main）',
      });
      // continue scanning to surface other violations too
    }
    const sources = extractImportSources(code);

    for (const source of sources) {
      const resolved = await resolveImport(importerAbs, source);
      if (resolved.kind !== 'internal') continue;

      const targetAbs = resolved.absPath;
      const targetRel = relToRoot(targetAbs);
      const targetLayer = layerOf(targetAbs);

      const allowKey = `${importerRel} -> ${targetRel}`;
      if (ALLOWLIST.has(allowKey)) continue;

      // ---------------- Rule 1: core cannot depend on app/features ----------------
      if (importerLayer === 'core' && (targetLayer === 'app' || targetLayer === 'features')) {
        violations.push({
          importerRel,
          source,
          targetRel,
          message: '[R1] core 不能依赖 app/features',
        });
        continue;
      }

      // ---------------- Rule 2: shared cannot depend on features ----------------
      if (importerLayer === 'shared' && targetLayer === 'features') {
        violations.push({
          importerRel,
          source,
          targetRel,
          message: '[R2] shared 不能依赖 features',
        });
        continue;
      }

      // ---------------- Rule 3: features/shared can only access app via app/public ----------------
      if ((importerLayer === 'features' || importerLayer === 'shared') && targetLayer === 'app') {
        if (!isAppPublicFile(targetAbs)) {
          violations.push({
            importerRel,
            source,
            targetRel,
            message: `[R3] ${importerLayer} 访问 app 只能通过 src/app/public.ts`,
          });
          continue;
        }
      }

      // ---------------- Rule 4: app/usecases cannot depend on features ----------------
      if (isUseCasesFile(importerAbs) && targetLayer === 'features') {
        violations.push({
          importerRel,
          source,
          targetRel,
          message: '[R4] app/usecases 不能依赖 features',
        });
        continue;
      }
    }
  }

  if (violations.length > 0) {
    console.error('\n================ Architecture Gate FAILED ================');
    for (const v of violations) {
      console.error(formatViolation(v));
      console.error('');
    }
    console.error(`Total violations: ${violations.length}`);
    console.error('========================================================\n');
    process.exitCode = 1;
    return;
  }

  console.log('\n✅ Architecture Gate PASSED (no boundary violations)');
}

await main();
