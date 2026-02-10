#!/usr/bin/env node
/**
 * di-resolve-gate
 * - Goal: 收敛 container.resolve() 到少数 composition roots
 * - Rule: only allow container.resolve() in:
 *   - src/app/bootstrap/**
 *   - src/app/ServiceManager.ts
 *   - (Round2) platform adapters should NOT resolve; only bootstrap/service manager may.
 *
 * Notes:
 * - We strip comments before matching to avoid false positives.
 */
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const SRC_DIR = path.join(projectRoot, "src");

// Round3: Only allow container.resolve() in a single composition root file.
// All other files must receive deps via parameter passing.
const ALLOW_PREFIXES = [path.join(SRC_DIR, "app", "bootstrap", "buildRuntime.ts")];

function isAllowed(filePath) {
  const abs = path.resolve(filePath);
  for (const p of ALLOW_PREFIXES) {
    if (p.endsWith(path.sep)) {
      if (abs.startsWith(p)) return true;
    } else {
      if (abs === p) return true;
    }
  }
  return false;
}

// naive comment stripper (good enough for gate)
function stripComments(code) {
  // remove block comments
  let out = code.replace(/\/\*[\s\S]*?\*\//g, "");
  // remove line comments
  out = out.replace(/\/\/.*$/gm, "");
  return out;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else if (/\.(ts|tsx|js|mjs)$/.test(e.name)) files.push(full);
  }
  return files;
}

const allFiles = walk(SRC_DIR);
const violations = [];

for (const file of allFiles) {
  if (isAllowed(file)) continue;
  const raw = fs.readFileSync(file, "utf-8");
  const code = stripComments(raw);
  const re = /\bcontainer\.resolve\s*\(/g;
  if (re.test(code)) {
    violations.push(file);
  }
}

if (violations.length) {
  console.error("❌ [di-resolve-gate] container.resolve() is not allowed outside composition roots.");
  for (const f of violations) console.error(" - " + path.relative(projectRoot, f));
  process.exit(1);
}

console.log("✅ [di-resolve-gate] OK: container.resolve() confined to composition roots");
