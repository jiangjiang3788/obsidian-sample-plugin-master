#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Shared Runtime Boundary Gate
// ---------------------------------------------------------------------------
// shared/** 是跨 feature 的纯 UI / 工具层，不应直接接收 Obsidian App 实例，
// 也不应依赖 app public barrel。需要运行时能力时，请通过 shared/types/actions.ts
// 的 handler 合同注入，例如：resolveResourcePath / onOpenRecordOrigin / onNotice。

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { failWithViolations, printOk } from '../lib/gate-formatter.mjs';

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
