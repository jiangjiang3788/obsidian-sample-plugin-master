#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Dual-System Gate
// ---------------------------------------------------------------------------
// 目的：防止“新旧两套系统并存/回潮”。
// - Feature 注册：必须集中在 app/features/registerFeatureContributions.ts + features/*/registerFeature.ts
//   FeatureLoader 只允许编排（bootAll / dispose），禁止直接 registry.register(...)
// - Capability 注册：必须集中在 app/capabilities/registerCapabilityContributions.ts
//   main.ts / createCapabilities.ts 禁止出现 capabilityRegistry.register(...) 或 registry.register(...)
//
// 说明：这是一个轻量文本门禁（去注释/去字符串后再匹配），用于防止回归。

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();

function rel(p) {
  return path.relative(ROOT, p).replaceAll('\\', '/');
}

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

function exists(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function stripNoise(code) {
  // block comments
  let s = code.replace(/\/\*[\s\S]*?\*\//g, ' ');
  // line comments
  s = s.replace(/(^|[^:])\/\/.*$/gm, '$1 ');
  // strings
  s = s.replace(/'([^'\\]|\\.)*'/g, "''");
  s = s.replace(/\"([^\"\\]|\\.)*\"/g, '""');
  s = s.replace(/`([^`\\]|\\.)*`/g, '``');
  return s;
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
  const violations = [];

  const featureLoader = path.join(ROOT, 'src', 'app', 'FeatureLoader.ts');
  const mainTs = path.join(ROOT, 'src', 'main.ts');
  const createCaps = path.join(ROOT, 'src', 'app', 'capabilities', 'createCapabilities.ts');

  if (exists(featureLoader)) {
    const t = stripNoise(read(featureLoader));
    if (/\bregistry\s*\.\s*register\s*\(/.test(t)) {
      violations.push(
        fmt(
          'DUAL-001',
          `${rel(featureLoader)} 禁止直接调用 registry.register(...)（Feature 注册必须集中化）`,
          `修复：把注册移动到 src/app/features/registerFeatureContributions.ts 或 src/features/<x>/registerFeature.ts；FeatureLoader 只做编排。`
        )
      );
    }
  }

  if (exists(mainTs)) {
    const t = stripNoise(read(mainTs));
    if (/\bcapabilityRegistry\s*\.\s*register\s*\(/.test(t)) {
      violations.push(
        fmt(
          'DUAL-002',
          `${rel(mainTs)} 禁止 capabilityRegistry.register(...)（Capability 注册必须集中化）`,
          `修复：把注册移动到 src/app/capabilities/registerCapabilityContributions.ts（再由 createDefaultCapabilityRegistry() 调用）。`
        )
      );
    }
  }

  if (exists(createCaps)) {
    const t = stripNoise(read(createCaps));
    if (/\bregistry\s*\.\s*register\s*\(/.test(t)) {
      violations.push(
        fmt(
          'DUAL-003',
          `${rel(createCaps)} 禁止直接 registry.register(...)（createCapabilities 不应承载注册细节）`,
          `修复：把注册移动到 src/app/capabilities/registerCapabilityContributions.ts，然后在 createDefaultCapabilityRegistry() 内调用。`
        )
      );
    }
  }

  if (violations.length) {
    printViolations('Dual-System Gate', violations);
    process.exit(1);
  }

  console.log('✅ Dual-System Gate 通过（防止新旧系统并存/回潮）');
}

main();
